import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Calculator,
  TrendingUp,
  Users,
  Milk,
  IndianRupee,
} from "lucide-react";
import { dailyApi, ApiError } from "@/lib/api-client";
import { EndOfDayProcess } from "@shared/api";

interface EndOfDayProcessorProps {
  onProcessComplete?: () => void;
}

export function EndOfDayProcessor({ onProcessComplete }: EndOfDayProcessorProps) {
  const [processing, setProcessing] = useState(false);
  const [lastProcess, setLastProcess] = useState<EndOfDayProcess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dailyTotals, setDailyTotals] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const loadTodayTotals = async () => {
    try {
      const totals = await dailyApi.getDailyTotals(today);
      setDailyTotals(totals);
    } catch (err) {
      console.error('Failed to load daily totals:', err);
    }
  };

  const handleProcessEndOfDay = async () => {
    try {
      setProcessing(true);
      setError(null);

      // Process end of day for today
      const result = await dailyApi.processEndOfDay(today);
      setLastProcess(result);

      // Reload daily totals
      await loadTodayTotals();

      if (onProcessComplete) {
        onProcessComplete();
      }

      setIsDialogOpen(false);
    } catch (err) {
      console.error('Failed to process end of day:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to process end of day');
    } finally {
      setProcessing(false);
    }
  };

  const isAfterMidnight = () => {
    const now = new Date();
    return now.getHours() >= 0 && now.getHours() < 6; // Between 12 AM and 6 AM
  };

  const canProcessToday = () => {
    return isAfterMidnight() || new Date().getHours() >= 22; // After 10 PM or after midnight
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          End of Day Processing
        </CardTitle>
        <CardDescription>
          Complete daily operations and prepare for next day deliveries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            {canProcessToday() ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Ready to Process
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Waiting for EOD Time
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            Current Time: {new Date().toLocaleTimeString()}
          </span>
        </div>

        {/* Daily Totals Preview */}
        {dailyTotals && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Revenue</span>
              </div>
              <div className="text-lg font-bold">₹{dailyTotals.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Milk className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Milk Sold</span>
              </div>
              <div className="text-lg font-bold">{dailyTotals.totalMilk}L</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Customers</span>
              </div>
              <div className="text-lg font-bold">{dailyTotals.customerCount}</div>
            </div>
          </div>
        )}

        {/* Last Process Info */}
        {lastProcess && (
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Last Processed:</span>
              <Badge variant={lastProcess.status === 'completed' ? 'default' : 'destructive'}>
                {lastProcess.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>Date: {lastProcess.date}</div>
              <div>Revenue: ₹{lastProcess.totalRevenue.toLocaleString()}</div>
              <div>Deliveries: {lastProcess.totalDeliveries}</div>
              <div>Milk: {lastProcess.totalMilkDelivered}L</div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTodayTotals}
            disabled={processing}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Load Today's Totals
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={!canProcessToday() || processing}
                className="flex-1"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2" />
                )}
                Process End of Day
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm End of Day Processing</DialogTitle>
                <DialogDescription>
                  This will complete today's operations and lock quantity changes for tomorrow. 
                  Are you sure you want to proceed?
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">What will happen:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Lock quantity changes for tomorrow
                    </li>
                    <li className="flex items-center gap-2">
                      <Calculator className="h-3 w-3" />
                      Calculate and add daily totals to monthly revenue
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" />
                      Update customer and worker statistics
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      Prepare system for next day operations
                    </li>
                  </ul>
                </div>

                {dailyTotals && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Today's Summary:</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Revenue</div>
                        <div className="font-medium">₹{dailyTotals.totalRevenue.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Milk Sold</div>
                        <div className="font-medium">{dailyTotals.totalMilk}L</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Customers</div>
                        <div className="font-medium">{dailyTotals.customerCount}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleProcessEndOfDay} disabled={processing}>
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirm Process
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground">
          <p>• End of day processing is available after 10 PM</p>
          <p>• This locks quantity changes and calculates daily totals</p>
          <p>• Process should be run once per day after all deliveries are complete</p>
        </div>
      </CardContent>
    </Card>
  );
}
