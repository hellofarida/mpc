/**
 * Hand-run: npm run analytics:prune [-- --days 90] [-- --yes]
 * Deletes RAW events older than N days (default 90) so the table stays small. It only counts unless you add --yes.
 * Check-ins are not touched. Run the report first if you want to keep the numbers: pruned events can't be recovered.
 */
import { hasAdminKey, pruneEventsBefore } from "../lib/db-admin";

const args = process.argv.slice(2);
const days = args.includes("--days") ? Number(args[args.indexOf("--days") + 1]) : 90;

async function main() {
  if (!hasAdminKey()) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  if (!Number.isFinite(days) || days < 7) throw new Error("--days must be a number of at least 7");
  const before = new Date(Date.now() - days * 86400000).toISOString();
  const yes = args.includes("--yes");
  const n = await pruneEventsBefore(before, !yes);
  console.log(yes ? `Deleted ${n} events older than ${before.slice(0, 10)}.` : `${n} events are older than ${before.slice(0, 10)}. Nothing deleted: add --yes to delete them.`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
