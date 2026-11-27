import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** The shadcn card without its outline, background and padding: a titled section that sits flat on the page. */
export function PlainCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn("gap-2 rounded-none bg-transparent py-0 ring-0", className)} {...props} />;
}
export function PlainCardHeader({ className, ...props }: React.ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn("px-0", className)} {...props} />;
}
export const PlainCardTitle = CardTitle;
export function PlainCardContent({ className, ...props }: React.ComponentProps<typeof CardContent>) {
  return <CardContent className={cn("px-0", className)} {...props} />;
}
