package app.poolhawk;

import android.app.job.JobParameters;
import android.app.job.JobService;

/** Background check every 15 minutes (Pro only): price alerts and whale trades. */
public class AlertJob extends JobService {
    @Override
    public boolean onStartJob(final JobParameters params) {
        Pro.init(this);
        if (!Pro.isActive()) return false;
        new Thread(() -> {
            try {
                Watcher.run(getApplicationContext());
            } finally {
                jobFinished(params, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }
}
