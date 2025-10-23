// utils/signature.ts
import { ethers } from 'ethers';

/**
 * Verify a signature against a message and expected address
 */
export async function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    const recoveredAddress = await recoverAddress(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Recover the signer's address from a message and signature
 */
export async function recoverAddress(
  message: string,
  signature: string
): Promise<string> {
  try {
    // Handle both personal_sign and eth_sign message formats
    const messageHash = ethers.hashMessage(message);
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);
    return recoveredAddress;
  } catch (error) {
    console.error('Address recovery error:', error);
    throw new Error('Failed to recover address from signature');
  }
}

/**
 * Verify multiple signatures in parallel
 */
export async function verifyMultipleSignatures(
  signatures: Array<{ message: string; signature: string; address?: string }>
): Promise<Array<{ isValid: boolean; signer: string; message: string }>> {
  const results = await Promise.all(
    signatures.map(async ({ message, signature, address }) => {
      try {
        const signer = await recoverAddress(message, signature);
        const isValid = address 
          ? await verifySignature(message, signature, address)
          : true; // If no address provided, just recover the signer
        
        return {
          isValid,
          signer,
          message
        };
      } catch (error) {
        return {
          isValid: false,
          signer: '',
          message
        };
      }
    })
  );
  
  return results;
}

/**
 * Format address for consistent comparison (lowercase with 0x prefix)
 */
export function formatAddress(address: string): string {
  if (!address.startsWith('0x')) {
    address = '0x' + address;
  }
  return address.toLowerCase();
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}