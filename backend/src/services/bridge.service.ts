import { env } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Bridge API base URL
// ---------------------------------------------------------------------------
const BRIDGE_API_BASE = 'https://api.bridgeapi.io/v2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BankAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  iban: string;
}

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Mock data for development
// ---------------------------------------------------------------------------

const MOCK_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc_dev_001',
    name: 'Compte courant',
    balance: 12_450.83,
    currency: 'EUR',
    iban: 'FR76 3000 6000 0112 3456 7890 189',
  },
  {
    id: 'acc_dev_002',
    name: 'Compte \u00e9pargne',
    balance: 45_230.00,
    currency: 'EUR',
    iban: 'FR76 3000 6000 0198 7654 3210 142',
  },
];

const MOCK_TRANSACTIONS: BankTransaction[] = [
  { id: 'tx_001', date: '2026-02-18', description: 'Virement SARL Martin - Facture 2026-0142', amount: 3_500.00, currency: 'EUR', category: 'income' },
  { id: 'tx_002', date: '2026-02-17', description: 'Prlv EDF - Contrat 1234567890', amount: -187.43, currency: 'EUR', category: 'utilities' },
  { id: 'tx_003', date: '2026-02-16', description: 'CB Carrefour Paris 15', amount: -95.67, currency: 'EUR', category: 'shopping' },
  { id: 'tx_004', date: '2026-02-15', description: 'Virement Dupont & Associes', amount: 1_200.00, currency: 'EUR', category: 'income' },
  { id: 'tx_005', date: '2026-02-14', description: 'Prlv Assurance MMA - Police 987654', amount: -145.20, currency: 'EUR', category: 'insurance' },
  { id: 'tx_006', date: '2026-02-13', description: 'CB Amazon EU SARL', amount: -49.99, currency: 'EUR', category: 'shopping' },
  { id: 'tx_007', date: '2026-02-12', description: 'Virement Client SCI Rivoli', amount: 2_800.00, currency: 'EUR', category: 'income' },
  { id: 'tx_008', date: '2026-02-11', description: 'Prlv Orange - Ligne 06 12 34 56 78', amount: -39.99, currency: 'EUR', category: 'telecom' },
  { id: 'tx_009', date: '2026-02-10', description: 'CB Total Energies Station A6', amount: -72.50, currency: 'EUR', category: 'transport' },
  { id: 'tx_010', date: '2026-02-09', description: 'Remise cheque - Cabinet Lefevre', amount: 850.00, currency: 'EUR', category: 'income' },
];

// ---------------------------------------------------------------------------
// BridgeService
// ---------------------------------------------------------------------------

export class BridgeService {
  // -----------------------------------------------------------------------
  // isConfigured
  // -----------------------------------------------------------------------
  /**
   * Check whether Bridge API credentials are set and usable.
   * Returns false if the client ID is empty or a placeholder value.
   */
  static isConfigured(): boolean {
    return (
      !!env.BRIDGE_CLIENT_ID &&
      env.BRIDGE_CLIENT_ID !== '' &&
      env.BRIDGE_CLIENT_ID !== 'placeholder'
    );
  }

  // -----------------------------------------------------------------------
  // createConnectSession
  // -----------------------------------------------------------------------
  /**
   * Create a Bridge Connect session that redirects the user to their bank's
   * authentication page. After the user authenticates, Bridge establishes
   * a connection to fetch account and transaction data.
   *
   * @param tenantId - Internal tenant identifier for tracking
   * @param redirectUrl - URL to redirect to after the bank connection is established
   * @returns The connect session URL and session ID
   */
  static async createConnectSession(
    tenantId: string,
    redirectUrl: string,
  ): Promise<{ url: string; sessionId: string }> {
    try {
      if (!BridgeService.isConfigured()) {
        const mockSessionId = `bsess_dev_${tenantId.slice(0, 8)}`;
        const mockUrl = `http://localhost:3000/banking/connect?session=${mockSessionId}`;
        logger.info('Bridge [DEV] createConnectSession', { tenantId, sessionId: mockSessionId });
        return { url: mockUrl, sessionId: mockSessionId };
      }

      const response = await BridgeService.apiRequest('POST', '/connect/items/add', {
        redirect_url: redirectUrl,
        context: { tenant_id: tenantId },
      });

      logger.info('Bridge connect session created', { tenantId, sessionId: response.id });
      return { url: response.redirect_url, sessionId: response.id };
    } catch (error) {
      logger.error('Failed to create Bridge connect session', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // getAccounts
  // -----------------------------------------------------------------------
  /**
   * List all bank accounts associated with a Bridge connection.
   *
   * @param connectionId - Bridge connection/item ID
   * @returns Array of bank accounts with balance, currency, and IBAN
   */
  static async getAccounts(connectionId: string): Promise<BankAccount[]> {
    try {
      if (!BridgeService.isConfigured()) {
        logger.info('Bridge [DEV] getAccounts', { connectionId, accountCount: MOCK_ACCOUNTS.length });
        return MOCK_ACCOUNTS;
      }

      const response = await BridgeService.apiRequest(
        'GET',
        `/items/${connectionId}/accounts`,
      );

      const accounts: BankAccount[] = (response.resources ?? []).map((acc: any) => ({
        id: String(acc.id),
        name: acc.name,
        balance: acc.balance,
        currency: acc.currency_code ?? 'EUR',
        iban: acc.iban ?? '',
      }));

      logger.debug('Bridge accounts retrieved', { connectionId, count: accounts.length });
      return accounts;
    } catch (error) {
      logger.error('Failed to get accounts from Bridge', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // getTransactions
  // -----------------------------------------------------------------------
  /**
   * Retrieve transactions for all accounts in a Bridge connection.
   * Optionally filter by a start date.
   *
   * @param connectionId - Bridge connection/item ID
   * @param since - Optional ISO date string to filter transactions from this date onwards
   * @returns Array of transactions with amount, description, and category
   */
  static async getTransactions(
    connectionId: string,
    since?: string,
  ): Promise<BankTransaction[]> {
    try {
      if (!BridgeService.isConfigured()) {
        let mockData = MOCK_TRANSACTIONS;
        if (since) {
          mockData = mockData.filter((tx) => tx.date >= since);
        }
        logger.info('Bridge [DEV] getTransactions', { connectionId, since, count: mockData.length });
        return mockData;
      }

      let path = `/items/${connectionId}/transactions`;
      if (since) {
        path += `?since=${encodeURIComponent(since)}`;
      }

      const response = await BridgeService.apiRequest('GET', path);

      const transactions: BankTransaction[] = (response.resources ?? []).map((tx: any) => ({
        id: String(tx.id),
        date: tx.date,
        description: tx.description ?? tx.raw_description ?? '',
        amount: tx.amount,
        currency: tx.currency_code ?? 'EUR',
        category: tx.category?.name ?? 'uncategorized',
      }));

      logger.debug('Bridge transactions retrieved', { connectionId, count: transactions.length });
      return transactions;
    } catch (error) {
      logger.error('Failed to get transactions from Bridge', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // syncConnection
  // -----------------------------------------------------------------------
  /**
   * Trigger a manual synchronization of a bank connection to fetch the
   * latest account balances and transactions.
   *
   * @param connectionId - Bridge connection/item ID
   * @returns Whether the sync succeeded and how many transactions were fetched
   */
  static async syncConnection(
    connectionId: string,
  ): Promise<{ synced: boolean; transactionCount: number }> {
    try {
      if (!BridgeService.isConfigured()) {
        logger.info('Bridge [DEV] syncConnection', { connectionId, synced: true, transactionCount: 10 });
        return { synced: true, transactionCount: 10 };
      }

      await BridgeService.apiRequest('POST', `/items/${connectionId}/refresh`);

      // After triggering refresh, fetch latest transactions to get count
      const transactions = await BridgeService.getTransactions(connectionId);

      logger.info('Bridge connection synced', { connectionId, transactionCount: transactions.length });
      return { synced: true, transactionCount: transactions.length };
    } catch (error) {
      logger.error('Failed to sync Bridge connection', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // deleteConnection
  // -----------------------------------------------------------------------
  /**
   * Revoke and delete a bank connection, removing all associated data
   * from Bridge's servers.
   *
   * @param connectionId - Bridge connection/item ID to delete
   */
  static async deleteConnection(connectionId: string): Promise<void> {
    try {
      if (!BridgeService.isConfigured()) {
        logger.info('Bridge [DEV] deleteConnection', { connectionId });
        return;
      }

      await BridgeService.apiRequest('DELETE', `/items/${connectionId}`);
      logger.info('Bridge connection deleted', { connectionId });
    } catch (error) {
      logger.error('Failed to delete Bridge connection', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // apiRequest (private)
  // -----------------------------------------------------------------------
  /**
   * Make an authenticated request to the Bridge API.
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE)
   * @param path - API path relative to /v2 (e.g. /items/123/accounts)
   * @param body - Optional request body (will be JSON-encoded)
   * @returns Parsed JSON response
   */
  private static async apiRequest(
    method: string,
    path: string,
    body?: any,
  ): Promise<any> {
    const url = `${BRIDGE_API_BASE}${path}`;

    const headers: Record<string, string> = {
      'Client-Id': env.BRIDGE_CLIENT_ID,
      'Client-Secret': env.BRIDGE_CLIENT_SECRET,
      'Bridge-Version': '2021-06-01',
      Accept: 'application/json',
    };

    const options: RequestInit = { method, headers };

    if (body) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Bridge API ${method} ${path} failed (${response.status}): ${errorBody}`);
    }

    // Some endpoints may return 204 with no body
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }
}
