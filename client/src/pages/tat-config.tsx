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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Clock, Settings, Save } from "lucide-react";

const tatConfigSchema = z.object({
  officeStartHour: z.coerce.number().min(0).max(23),
  officeEndHour: z.coerce.number().min(0).max(23),
  timezone: z.string().min(1),
  skipWeekends: z.boolean(),
});

type TATConfig = z.infer<typeof tatConfigSchema>;

export default function TATConfig() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: config, isLoading: isConfigLoading } = useQuery<TATConfig>({
    queryKey: ["/api/tat-config"],
    retry: false,
  });

  const form = useForm<z.infer<typeof tatConfigSchema>>({
    resolver: zodResolver(tatConfigSchema),
    defaultValues: {
      officeStartHour: 9,
      officeEndHour: 18,
      timezone: "Asia/Kolkata",
      skipWeekends: true,
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
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
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
                                Exclude weekends from TAT calculations
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

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Current Settings:</strong><br />
                    Office Hours: {form.watch("officeStartHour")}:00 - {form.watch("officeEndHour")}:00<br />
                    Timezone: {form.watch("timezone")}<br />
                    Skip Weekends: {form.watch("skipWeekends") ? "Yes" : "No"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}