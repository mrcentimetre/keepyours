import { encodeFunctionData, erc20Abi, formatUnits, parseUnits, type Address, type Hex } from "viem";
import { chain, publicClient } from "./zerodev";

export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC as Address | undefined;
const DECIMALS = 6;

export const explorerTx = (hash: Hex) => `${chain.blockExplorers.default.url}/tx/${hash}`;

/** USDC held by `owner`, as a plain number of dollars (6 decimals is exact enough to display). */
export async function readUsdcBalance(owner: Address): Promise<number> {
  if (!USDC_ADDRESS) return 0;
  const raw = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [owner],
  });
  return Number(formatUnits(raw, DECIMALS));
}

/** Calldata for a USDC transfer. `amount` is a decimal string like "12.50" — never a float. */
export function usdcTransferData(to: Address, amount: string): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, parseUnits(amount, DECIMALS)],
  });
}
