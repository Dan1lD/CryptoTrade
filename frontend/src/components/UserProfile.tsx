import { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface UserProfileProps {
  user: User;
}

export default function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-semibold" data-testid="text-username">{user.username}</h2>
                <p className="text-muted-foreground" data-testid="text-email">{user.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Member since {format(new Date(user.createdAt), "MMMM yyyy")}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-semibold" data-testid="text-completed-trades">
                      {user.completedTrades}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed Trades</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-semibold" data-testid="text-success-rate">
                      {parseFloat(user.successRate).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-semibold">
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">Trader Status</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trading Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Volume Traded</span>
              <span className="font-semibold">$127,450</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Average Response Time</span>
              <span className="font-semibold">12 minutes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Preferred Cryptocurrencies</span>
              <div className="flex gap-2">
                <Badge variant="secondary">BTC</Badge>
                <Badge variant="secondary">ETH</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
