import TonWeb from 'tonweb';
import nacl from 'tweetnacl';
import { encrypt } from '../utils/encryption.js';
import { hasEnv } from '../config/env.js';

const TONCENTER_RPC = 'https://toncenter.com/api/v2/jsonRPC';

let provider = null;
let tonweb = null;

function getProvider() {
  if (!provider) {
    // TON_API_KEY is an optional integration: toncenter still serves requests
    // without it, just at a lower rate limit.
    const apiKey = hasEnv('TON_API_KEY') ? process.env.TON_API_KEY : undefined;
    provider = new TonWeb.HttpProvider(TONCENTER_RPC, apiKey ? { apiKey } : {});
  }
  return provider;
}

function getTonWeb() {
  if (!tonweb) tonweb = new TonWeb(getProvider());
  return tonweb;
}

// Creates a real TON v4R2 wallet and returns the address plus the encrypted
// private key. Failures propagate to the caller — we never fabricate a fake
// address, because a user could then "hold" SIDI at an address nobody controls.
export async function createWallet() {
  const keyPair = nacl.sign.keyPair();

  const WalletClass = getTonWeb().wallet.all.v4R2;
  const wallet = new WalletClass(getProvider(), {
    publicKey: keyPair.publicKey,
  });

  const address = await wallet.getAddress();
  const walletAddress = address.toString(true, true, false);

  const privateKeyHex = Buffer.from(keyPair.secretKey).toString('hex');
  const encryptedKey = encrypt(privateKeyHex);

  return {
    address: walletAddress,
    encryptedPrivateKey: encryptedKey,
  };
}
