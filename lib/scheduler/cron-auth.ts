/**
 * Resolve the scheduler processor secret across local and Azure App Service
 * configuration conventions.
 */
export function getSchedulerCronSecret(): string | undefined {
  return (
    process.env.CRON_SECRET?.trim() || process.env.CUSTOMCONNSTR_CRON_SECRET?.trim() || undefined
  );
}
