import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Clock, Settings, Save, Info, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const tatConfigSchema = z.object({
  officeStartHour: z.coerce.number().min(0).max(23),
  officeEndHour: z.coerce.number().min(0).max(23),
  timezone: z.string().min(1),
  skipWeekends: z.boolean(),
  weekendDays: z.string().optional(), // Comma-separated weekend days
}).refine((data) => data.officeEndHour > data.officeStartHour, {
  message: "Office end hour must be after start hour",
  path: ["officeEndHour"],
}).refine((data) => (data.officeEndHour - data.officeStartHour) >= 1, {
  message: "Office must be open for at least 1 hour",
  path: ["officeEndHour"],
});

type TATConfig = z.infer<typeof tatConfigSchema>;

const WEEK_DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export default function TATConfig() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, handleTokenExpired } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      handleTokenExpired();
    }
  }, [isAuthenticated, isLoading, handleTokenExpired]);

  const { data: config, isLoading: isConfigLoading } = useQuery<TATConfig>({
    queryKey: ["/api/tat-config"],
    retry: false,
    staleTime: 300000, // 5 minutes - TAT config rarely changes
  });

  const form = useForm<z.infer<typeof tatConfigSchema>>({
    resolver: zodResolver(tatConfigSchema),
    defaultValues: {
      officeStartHour: 9,
      officeEndHour: 18,
      timezone: "Asia/Kolkata",
      skipWeekends: true,
      weekendDays: "0,6", // Sunday and Saturday by default
    },
  });

  // Update form when config data is loaded
  useEffect(() => {
    if (config) {
      form.reset({
        officeStartHour: config.officeStartHour || 9,
        officeEndHour: config.officeEndHour || 18,
        timezone: config.timezone || "Asia/Kolkata",
        skipWeekends: config.skipWeekends !== undefined ? config.skipWeekends : true,
        weekendDays: config.weekendDays || "0,6",
      });
    }
  }, [config, form]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tatConfigSchema>) => {
      await apiRequest("POST", "/api/tat-config", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "TAT configuration updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tat-config"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        handleTokenExpired();
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update TAT configuration",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof tatConfigSchema>) => {
    updateConfigMutation.mutate(data);
  };

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header 
          title="TAT Configuration" 
          description="Configure office hours and turn-around time calculation settings"
          actions={
            <Button 
              form="tat-config-form"
              type="submit" 
              disabled={updateConfigMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          }
        />

        <div className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* TAT Configuration Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  TAT Calculation Settings
                </CardTitle>
                <CardDescription>
                  Configure how turn-around times are calculated for your workflows
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isConfigLoading ? (
                  <div>Loading configuration...</div>
                ) : (
                  <Form {...form}>
                    <form id="tat-config-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="officeStartHour"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Office Start Hour</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="23" 
                                placeholder="9" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Hour when office work begins (24-hour format)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="officeEndHour"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Office End Hour</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="23" 
                                placeholder="18" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Hour when office work ends (24-hour format)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                                <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                                <SelectItem value="Australia/Sydney">Australia/Sydney (AEST)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Timezone for TAT calculations
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="skipWeekends"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Skip Weekends</FormLabel>
                              <FormDescription>
                                Exclude weekend days from TAT calculations
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch("skipWeekends") && (
                        <FormField
                          control={form.control}
                          name="weekendDays"
                          render={({ field }) => {
                            const selectedDays = field.value?.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d)) || [];
                            
                            const toggleDay = (dayValue: number) => {
                              let newDays = [...selectedDays];
                              if (newDays.includes(dayValue)) {
                                newDays = newDays.filter(d => d !== dayValue);
                              } else {
                                newDays.push(dayValue);
                              }
                              newDays.sort();
                              field.onChange(newDays.join(','));
                            };

                            return (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Weekend Days
                                </FormLabel>
                                <FormDescription>
                                  Select which days are considered weekends for your organization
                                </FormDescription>
                                <div className="grid grid-cols-7 gap-2 mt-2">
                                  {WEEK_DAYS.map((day) => {
                                    const isSelected = selectedDays.includes(day.value);
                                    return (
                                      <Button
                                        key={day.value}
                                        type="button"
                                        variant={isSelected ? "default" : "outline"}
                                        className="h-16 flex flex-col items-center justify-center"
                                        onClick={() => toggleDay(day.value)}
                                      >
                                        <span className="text-xs font-medium">{day.short}</span>
                                        <span className="text-[10px] opacity-70">{day.label.slice(0, 3)}</span>
                                      </Button>
                                    );
                                  })}
                                </div>
                                <Alert className="mt-3">
                                  <Info className="h-4 w-4" />
                                  <AlertDescription>
                                    {selectedDays.length === 0 && "No weekend days selected - all days are working days"}
                                    {selectedDays.length === 1 && `${WEEK_DAYS.find(d => d.value === selectedDays[0])?.label} is your weekend`}
                                    {selectedDays.length === 2 && selectedDays.includes(0) && selectedDays.includes(6) && "Saturday & Sunday are weekends (Standard)"}
                                    {selectedDays.length === 2 && (!selectedDays.includes(0) || !selectedDays.includes(6)) && `${WEEK_DAYS.filter(d => selectedDays.includes(d.value)).map(d => d.label).join(' & ')} are weekends`}
                                    {selectedDays.length > 2 && `${selectedDays.length} days selected as weekends`}
                                  </AlertDescription>
                                </Alert>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      )}
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            {/* TAT Calculation Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  TAT Calculation Methods
                </CardTitle>
                <CardDescription>
                  Understanding how different TAT types work
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold">Hour TAT</h4>
                    <p className="text-sm text-muted-foreground">
                      Adds hours considering office hours. If calculation goes beyond office hours, 
                      it moves to next working day.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-semibold">Day TAT</h4>
                    <p className="text-sm text-muted-foreground">
                      Adds full calendar days, automatically skipping weekends if enabled.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold">Before TAT</h4>
                    <p className="text-sm text-muted-foreground">
                      Calculates due date before the main deadline (TAT - Before TAT days).
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="font-semibold">Specify TAT</h4>
                    <p className="text-sm text-muted-foreground">
                      Adds specific hours regardless of office hours, useful for urgent tasks.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-semibold">Current Configuration:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Office Hours:</span>
                      <p className="font-medium">{form.watch("officeStartHour")}:00 - {form.watch("officeEndHour")}:00</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hours per Day:</span>
                      <p className="font-medium">{form.watch("officeEndHour") - form.watch("officeStartHour")} hours</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timezone:</span>
                      <p className="font-medium">{form.watch("timezone")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Skip Weekends:</span>
                      <p className="font-medium">{form.watch("skipWeekends") ? "Yes" : "No"}</p>
                    </div>
                    {form.watch("skipWeekends") && form.watch("weekendDays") && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Weekend Days:</span>
                        <p className="font-medium">
                          {form.watch("weekendDays")?.split(',').map(d => {
                            const day = WEEK_DAYS.find(wd => wd.value === parseInt(d.trim()));
                            return day?.label;
                          }).filter(Boolean).join(', ') || 'None'}
                        </p>
                      </div>
                    )}
                  </div>
                  <Alert className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Usage Example</AlertTitle>
                    <AlertDescription className="text-xs">
                      {form.watch("skipWeekends") 
                        ? `If a task starts on Friday at 2 PM with 2-day TAT, it will be due on ${
                            form.watch("weekendDays")?.includes('0') && form.watch("weekendDays")?.includes('6') 
                              ? 'Tuesday' 
                              : 'the next available working day'
                          } at 2 PM (weekends skipped).`
                        : 'Tasks will be calculated including all days of the week (no weekends skipped).'}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}