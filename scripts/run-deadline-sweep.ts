// Standalone runner for the deadline sweep — useful for local testing or if you'd rather run
// this off a plain cron/systemd-timer instead of Vercel Cron. `npm run cron:deadlines`.
import 'dotenv/config';
import { runDeadlineSweep } from '../src/lib/deadlineSweep';

runDeadlineSweep()
  .then((result) => {
    console.log('Deadline sweep complete:', result);
    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Deadline sweep failed:', err);
    process.exit(1);
  });
