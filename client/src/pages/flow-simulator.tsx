// import { useQuery, useMutation } from "@tanstack/react-query";
// import { useAuth } from "@/hooks/useAuth";
// import { useEffect, useState } from "react";
// import { useToast } from "@/hooks/use-toast";
// import { isUnauthorizedError } from "@/lib/authUtils";
// import { apiRequest, queryClient } from "@/lib/queryClient";
// import Header from "@/components/header";
// import Sidebar from "@/components/sidebar";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import { 
//   Play, 
//   Pause, 
//   RotateCcw, 
//   Clock, 
//   Users, 
//   TrendingUp, 
//   Activity,
//   CheckCircle,
//   AlertTriangle,
//   Timer,
//   Coffee,
//   Settings
// } from "lucide-react";
// import { format, addHours, addMinutes, isAfter, isBefore, parseISO } from "date-fns";

// interface SimulationTask {
//   id: string;
//   taskName: string;
//   doerEmail: string;
//   status: 'pending' | 'in_progress' | 'completed' | 'lunch_break';
//   startTime: Date;
//   plannedEndTime: Date;
//   actualEndTime?: Date;
//   tat: number;
//   tatType: string;
//   lunchBreakTaken: boolean;
//   waitingTime: number; // Time spent waiting before starting
//   processingTime: number; // Time spent actually working
// }

// interface FlowSimulation {
//   flowId: string;
//   system: string;
//   orderNumber: string;
//   description: string;
//   tasks: SimulationTask[];
//   currentTime: Date;
//   isRunning: boolean;
//   speed: number; // Simulation speed multiplier
//   totalThroughputTime: number;
//   completedTasks: number;
//   performance: number;
// }

// export default function FlowSimulator() {
//   const { toast } = useToast();
//   const { isAuthenticated, isLoading } = useAuth();
//   const [selectedSystem, setSelectedSystem] = useState<string>("");
//   const [simulation, setSimulation] = useState<FlowSimulation | null>(null);
//   const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  
//   // Enhanced simulation parameters
//   const [eventSpeed, setEventSpeed] = useState<number>(100); // Normal processing speed percentage
//   const [teamCount, setTeamCount] = useState<number>(1); // Number of people per task
//   const [peakTimeStart, setPeakTimeStart] = useState<string>("10:00"); // Peak time start
//   const [peakTimeEnd, setPeakTimeEnd] = useState<string>("16:00"); // Peak time end
//   const [peakSpeed, setPeakSpeed] = useState<number>(60); // Reduced speed during peak time
//   const [userSpeedMultipliers, setUserSpeedMultipliers] = useState<Record<string, number>>({}); // User-specific speeds

//   // Redirect to login if not authenticated
//   useEffect(() => {
//     if (!isLoading && !isAuthenticated) {
//       toast({
//         title: "Unauthorized",
//         description: "You are logged out. Logging in again...",
//         variant: "destructive",
//       });
//       setTimeout(() => {
//         window.location.href = "/api/login";
//       }, 500);
//       return;
//     }
//   }, [isAuthenticated, isLoading, toast]);

//   const { data: flowRules, isLoading: rulesLoading } = useQuery({
//     queryKey: ["/api/flow-rules"],
//     enabled: isAuthenticated,
//   });

//   const { data: tatConfig } = useQuery({
//     queryKey: ["/api/tat-config"],
//     enabled: isAuthenticated,
//   });

//   // Get unique systems for simulation
//   const availableSystems = Array.from(new Set((flowRules as any[])?.map(rule => rule.system) || []));

//   // Check if current time is in peak hours
//   const isInPeakTime = (currentTime: Date): boolean => {
//     const timeStr = format(currentTime, 'HH:mm');
//     return timeStr >= peakTimeStart && timeStr <= peakTimeEnd;
//   };

//   // Calculate effective speed considering all factors
//   const calculateEffectiveSpeed = (doerEmail: string, currentTime: Date): number => {
//     let baseSpeed = eventSpeed / 100; // Convert percentage to multiplier
    
//     // Apply peak time reduction
//     if (isInPeakTime(currentTime)) {
//       baseSpeed *= (peakSpeed / 100);
//     }
    
//     // Apply user-specific speed
//     const userSpeed = (userSpeedMultipliers[doerEmail] || 100) / 100;
//     baseSpeed *= userSpeed;
    
//     // Apply team count benefit (more people = faster completion, but with diminishing returns)
//     const teamMultiplier = 1 + (teamCount - 1) * 0.3; // Each additional person adds 30% efficiency
//     baseSpeed *= teamMultiplier;
    
//     return Math.max(0.1, baseSpeed); // Minimum 10% speed to prevent infinite times
//   };

//   // Calculate TAT with all enhancement factors
//   const calculateTATWithEnhancements = (startTime: Date, tat: number, tatType: string, doerEmail: string) => {
//     const config = (tatConfig as any) || { officeStartHour: 9, officeEndHour: 18 };
//     let baseEndTime = new Date(startTime);
    
//     switch (tatType) {
//       case 'hourtat':
//         baseEndTime = addHours(startTime, tat);
//         break;
//       case 'daytat':
//         baseEndTime = addHours(startTime, tat * 8); // 8 working hours per day
//         break;
//       case 'beforetat':
//         // Complete before specific time (assumes next day at specified hour)
//         baseEndTime = new Date(startTime);
//         baseEndTime.setDate(baseEndTime.getDate() + 1);
//         baseEndTime.setHours(config.officeStartHour + tat, 0, 0, 0);
//         break;
//       case 'specifytat':
//         baseEndTime = addMinutes(startTime, tat * 60); // Assuming hours for specify
//         break;
//     }
    
//     // Calculate effective duration considering speed factors
//     const baseDurationMs = baseEndTime.getTime() - startTime.getTime();
//     const effectiveSpeed = calculateEffectiveSpeed(doerEmail, startTime);
//     const adjustedDurationMs = baseDurationMs / effectiveSpeed;
    
//     let endTime = new Date(startTime.getTime() + adjustedDurationMs);
    
//     // Add 1 hour lunch break if the task spans lunch time (12:00-13:00)
//     const lunchStart = new Date(startTime);
//     lunchStart.setHours(12, 0, 0, 0);
//     const lunchEnd = new Date(startTime);
//     lunchEnd.setHours(13, 0, 0, 0);
    
//     if (isAfter(endTime, lunchStart) && isBefore(startTime, lunchEnd)) {
//       endTime = addHours(endTime, 1); // Add lunch break
//     }
    
//     return endTime;
//   };

//   // Create simulation tasks from flow rules
//   const createSimulationTasks = (system: string): SimulationTask[] => {
//     const systemRules = (flowRules as any[])?.filter(rule => rule.system === system) || [];
//     const startRule = systemRules.find(rule => rule.currentTask === "");
    
//     if (!startRule) return [];
    
//     const tasks: SimulationTask[] = [];
//     const currentTime = new Date();
//     let taskTime = new Date(currentTime);
    
//     // Create first task
//     const firstTaskEndTime = calculateTATWithEnhancements(taskTime, startRule.tat, startRule.tatType, startRule.email);
//     const firstTask: SimulationTask = {
//       id: `sim-${Date.now()}-1`,
//       taskName: startRule.nextTask,
//       doerEmail: startRule.email,
//       status: 'pending',
//       startTime: new Date(taskTime),
//       plannedEndTime: firstTaskEndTime,
//       tat: startRule.tat,
//       tatType: startRule.tatType,
//       lunchBreakTaken: false,
//       waitingTime: 0,
//       processingTime: 0
//     };
//     tasks.push(firstTask);
    
//     // Create subsequent tasks based on completion flow
//     let currentTask = startRule.nextTask;
//     let taskCounter = 2;
//     taskTime = new Date(firstTaskEndTime);
    
//     while (tasks.length < 10 && currentTask) { // Limit to 10 tasks for simulation
//       const nextRule = systemRules.find(rule => 
//         rule.currentTask === currentTask && rule.status === "Done"
//       );
      
//       if (!nextRule) break;
      
//       const taskEndTime = calculateTATWithEnhancements(taskTime, nextRule.tat, nextRule.tatType, nextRule.email);
//       const nextTask: SimulationTask = {
//         id: `sim-${Date.now()}-${taskCounter}`,
//         taskName: nextRule.nextTask,
//         doerEmail: nextRule.email,
//         status: 'pending',
//         startTime: new Date(taskTime),
//         plannedEndTime: taskEndTime,
//         tat: nextRule.tat,
//         tatType: nextRule.tatType,
//         lunchBreakTaken: false,
//         waitingTime: Math.random() * 30, // Random wait time 0-30 minutes
//         processingTime: 0
//       };
//       tasks.push(nextTask);
      
//       currentTask = nextRule.nextTask;
//       taskTime = new Date(taskEndTime);
//       taskCounter++;
//     }
    
//     return tasks;
//   };

//   // Start simulation
//   const startSimulation = () => {
//     if (!selectedSystem) {
//       toast({
//         title: "Error",
//         description: "Please select a system to simulate",
//         variant: "destructive",
//       });
//       return;
//     }
    
//     const tasks = createSimulationTasks(selectedSystem);
//     if (tasks.length === 0) {
//       toast({
//         title: "Error",
//         description: "No flow rules found for this system",
//         variant: "destructive",
//       });
//       return;
//     }
    
//     const newSimulation: FlowSimulation = {
//       flowId: `sim-flow-${Date.now()}`,
//       system: selectedSystem,
//       orderNumber: `SIM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
//       description: `Simulation of ${selectedSystem} workflow`,
//       tasks,
//       currentTime: new Date(),
//       isRunning: true,
//       speed: 60, // 60x speed (1 minute = 1 second)
//       totalThroughputTime: 0,
//       completedTasks: 0,
//       performance: 0
//     };
    
//     setSimulation(newSimulation);
    
//     // Start simulation interval
//     const interval = setInterval(() => {
//       setSimulation(prev => {
//         if (!prev || !prev.isRunning) return prev;
        
//         const newCurrentTime = addMinutes(prev.currentTime, prev.speed);
//         const updatedTasks = prev.tasks.map(task => {
//           const newTask = { ...task };
          
//           // Check if task should start
//           if (task.status === 'pending' && !isAfter(task.startTime, newCurrentTime)) {
//             newTask.status = 'in_progress';
//             newTask.startTime = new Date(newCurrentTime);
//           }
          
//           // Check for lunch break (12:00-13:00)
//           const lunchTime = new Date(newCurrentTime);
//           lunchTime.setHours(12, 0, 0, 0);
//           const lunchEnd = new Date(newCurrentTime);
//           lunchEnd.setHours(13, 0, 0, 0);
          
//           if (task.status === 'in_progress' && 
//               newCurrentTime >= lunchTime && 
//               newCurrentTime <= lunchEnd && 
//               !task.lunchBreakTaken) {
//             newTask.status = 'lunch_break';
//             newTask.lunchBreakTaken = true;
//           }
          
//           // Resume from lunch
//           if (task.status === 'lunch_break' && newCurrentTime > lunchEnd) {
//             newTask.status = 'in_progress';
//             // Extend planned end time by 1 hour for lunch
//             newTask.plannedEndTime = addHours(newTask.plannedEndTime, 1);
//           }
          
//           // Check if task should complete
//           if (task.status === 'in_progress' && !isAfter(task.plannedEndTime, newCurrentTime)) {
//             newTask.status = 'completed';
//             newTask.actualEndTime = new Date(newCurrentTime);
//             newTask.processingTime = Math.max(0, 
//               (newCurrentTime.getTime() - task.startTime.getTime()) / (1000 * 60) - 60 // Subtract lunch time
//             );
//           }
          
//           return newTask;
//         });
        
//         const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
//         const totalTime = updatedTasks.length > 0 ? 
//           (newCurrentTime.getTime() - updatedTasks[0].startTime.getTime()) / (1000 * 60 * 60) : 0;
        
//         return {
//           ...prev,
//           currentTime: newCurrentTime,
//           tasks: updatedTasks,
//           completedTasks: completedCount,
//           totalThroughputTime: totalTime,
//           performance: updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0
//         };
//       });
//     }, 1000); // Update every second
    
//     setSimulationInterval(interval);
//   };

//   // Pause/Resume simulation
//   const toggleSimulation = () => {
//     setSimulation(prev => {
//       if (!prev) return prev;
      
//       if (prev.isRunning && simulationInterval) {
//         clearInterval(simulationInterval);
//         setSimulationInterval(null);
//       } else if (!prev.isRunning) {
//         startSimulation();
//       }
      
//       return { ...prev, isRunning: !prev.isRunning };
//     });
//   };

//   // Reset simulation
//   const resetSimulation = () => {
//     if (simulationInterval) {
//       clearInterval(simulationInterval);
//       setSimulationInterval(null);
//     }
//     setSimulation(null);
//   };

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (simulationInterval) {
//         clearInterval(simulationInterval);
//       }
//     };
//   }, [simulationInterval]);

//   if (isLoading) {
//     return (
//       <div className="flex h-screen bg-neutral">
//         <Sidebar />
//         <main className="flex-1 overflow-y-auto">
//           <Header title="Flow Simulator" description="Simulate workflow execution with real-time visualization" />
//           <div className="p-6">
//             <div className="animate-pulse space-y-4">
//               <div className="bg-white rounded-xl p-6 shadow-sm border h-64"></div>
//             </div>
//           </div>
//         </main>
//       </div>
//     );
//   }

//   return (
//     <div className="flex h-screen bg-neutral">
//       <Sidebar />
//       <main className="flex-1 overflow-y-auto">
//         <Header title="Flow Simulator" description="Simulate workflow execution with real-time TAT calculations" />
        
//         <div className="p-6 space-y-6">
//           {/* Control Panel */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Activity className="w-5 h-5" />
//                 Simulation Control
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="flex items-center gap-4">
//                 <div className="flex-1">
//                   <Select value={selectedSystem} onValueChange={setSelectedSystem}>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select system to simulate" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {availableSystems.map((system: string) => (
//                         <SelectItem key={system} value={system}>
//                           {system}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
                
//                 <div className="flex gap-2">
//                   {!simulation ? (
//                     <Button onClick={startSimulation} disabled={!selectedSystem}>
//                       <Play className="w-4 h-4 mr-2" />
//                       Start Simulation
//                     </Button>
//                   ) : (
//                     <>
//                       <Button onClick={toggleSimulation} variant="outline">
//                         {simulation.isRunning ? (
//                           <>
//                             <Pause className="w-4 h-4 mr-2" />
//                             Pause
//                           </>
//                         ) : (
//                           <>
//                             <Play className="w-4 h-4 mr-2" />
//                             Resume
//                           </>
//                         )}
//                       </Button>
//                       <Button onClick={resetSimulation} variant="outline">
//                         <RotateCcw className="w-4 h-4 mr-2" />
//                         Reset
//                       </Button>
//                     </>
//                   )}
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Enhanced Simulation Parameters */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <TrendingUp className="w-5 h-5" />
//                 Performance Parameters
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
//                 {/* Event Speed */}
//                 <div>
//                   <label className="text-sm font-medium text-gray-700 mb-2 block">
//                     Event Speed (%)
//                   </label>
//                   <Select value={eventSpeed.toString()} onValueChange={(value) => setEventSpeed(Number(value))}>
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="50">50% - Slow</SelectItem>
//                       <SelectItem value="75">75% - Below Average</SelectItem>
//                       <SelectItem value="100">100% - Normal</SelectItem>
//                       <SelectItem value="125">125% - Fast</SelectItem>
//                       <SelectItem value="150">150% - Very Fast</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 {/* Team Count */}
//                 <div>
//                   <label className="text-sm font-medium text-gray-700 mb-2 block">
//                     Team Count per Task
//                   </label>
//                   <Select value={teamCount.toString()} onValueChange={(value) => setTeamCount(Number(value))}>
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="1">1 Person</SelectItem>
//                       <SelectItem value="2">2 People</SelectItem>
//                       <SelectItem value="3">3 People</SelectItem>
//                       <SelectItem value="4">4 People</SelectItem>
//                       <SelectItem value="5">5 People</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 {/* Peak Time Start */}
//                 <div>
//                   <label className="text-sm font-medium text-gray-700 mb-2 block">
//                     Peak Time Start
//                   </label>
//                   <Select value={peakTimeStart} onValueChange={setPeakTimeStart}>
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="09:00">09:00 AM</SelectItem>
//                       <SelectItem value="10:00">10:00 AM</SelectItem>
//                       <SelectItem value="11:00">11:00 AM</SelectItem>
//                       <SelectItem value="12:00">12:00 PM</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 {/* Peak Time End */}
//                 <div>
//                   <label className="text-sm font-medium text-gray-700 mb-2 block">
//                     Peak Time End
//                   </label>
//                   <Select value={peakTimeEnd} onValueChange={setPeakTimeEnd}>
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="14:00">02:00 PM</SelectItem>
//                       <SelectItem value="15:00">03:00 PM</SelectItem>
//                       <SelectItem value="16:00">04:00 PM</SelectItem>
//                       <SelectItem value="17:00">05:00 PM</SelectItem>
//                       <SelectItem value="18:00">06:00 PM</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 {/* Peak Speed */}
//                 <div>
//                   <label className="text-sm font-medium text-gray-700 mb-2 block">
//                     Speed in Peak Time (%)
//                   </label>
//                   <Select value={peakSpeed.toString()} onValueChange={(value) => setPeakSpeed(Number(value))}>
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="40">40% - Very Slow</SelectItem>
//                       <SelectItem value="50">50% - Slow</SelectItem>
//                       <SelectItem value="60">60% - Reduced</SelectItem>
//                       <SelectItem value="70">70% - Slightly Reduced</SelectItem>
//                       <SelectItem value="80">80% - Minor Impact</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 {/* Simulation Speed Multiplier */}
//                 <div>
//                   <label className="text-sm font-medium text-gray-700 mb-2 block">
//                     Simulation Speed
//                   </label>
//                   <Select value={(simulation?.speed || 1).toString()} onValueChange={(value) => {
//                     setSimulation(prev => prev ? {...prev, speed: Number(value)} : null);
//                   }}>
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="1">1x - Real Time</SelectItem>
//                       <SelectItem value="2">2x - Fast</SelectItem>
//                       <SelectItem value="5">5x - Very Fast</SelectItem>
//                       <SelectItem value="10">10x - Ultra Fast</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </div>

//               {/* User Speed Configuration */}
//               {selectedSystem && (
//                 <div className="mt-6">
//                   <h4 className="text-sm font-medium text-gray-700 mb-3">User-Specific Speed Multipliers</h4>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
//                     {Array.from(new Set(
//                       (flowRules as any[])?.filter(rule => rule.system === selectedSystem)
//                         .map(rule => rule.email) || []
//                     )).map((email: string) => (
//                       <div key={email} className="flex items-center gap-2">
//                         <span className="text-xs text-gray-600 flex-1 truncate">{email.split('@')[0]}</span>
//                         <Select 
//                           value={(userSpeedMultipliers[email] || 100).toString()} 
//                           onValueChange={(value) => {
//                             setUserSpeedMultipliers(prev => ({
//                               ...prev,
//                               [email]: Number(value)
//                             }));
//                           }}
//                         >
//                           <SelectTrigger className="w-24">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="50">50%</SelectItem>
//                             <SelectItem value="75">75%</SelectItem>
//                             <SelectItem value="100">100%</SelectItem>
//                             <SelectItem value="125">125%</SelectItem>
//                             <SelectItem value="150">150%</SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           {simulation && (
//             <>
//               {/* Simulation Status */}
//               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                 <Card>
//                   <CardContent className="p-4">
//                     <div className="flex items-center gap-2">
//                       <Clock className="w-4 h-4 text-blue-600" />
//                       <div>
//                         <p className="text-sm text-gray-600">Current Time</p>
//                         <p className="font-semibold">{format(simulation.currentTime, 'HH:mm:ss')}</p>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
                
//                 <Card>
//                   <CardContent className="p-4">
//                     <div className="flex items-center gap-2">
//                       <CheckCircle className="w-4 h-4 text-green-600" />
//                       <div>
//                         <p className="text-sm text-gray-600">Completed Tasks</p>
//                         <p className="font-semibold">{simulation.completedTasks}/{simulation.tasks.length}</p>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
                
//                 <Card>
//                   <CardContent className="p-4">
//                     <div className="flex items-center gap-2">
//                       <TrendingUp className="w-4 h-4 text-orange-600" />
//                       <div>
//                         <p className="text-sm text-gray-600">Performance</p>
//                         <p className="font-semibold">{simulation.performance}%</p>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
                
//                 <Card>
//                   <CardContent className="p-4">
//                     <div className="flex items-center gap-2">
//                       <Timer className="w-4 h-4 text-purple-600" />
//                       <div>
//                         <p className="text-sm text-gray-600">Throughput Time</p>
//                         <p className="font-semibold">{simulation.totalThroughputTime.toFixed(1)}h</p>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               </div>

//               {/* Flow Visualization */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="flex items-center gap-2">
//                     <Activity className="w-5 h-5" />
//                     Flow Execution Timeline
//                     <Badge variant="outline" className="ml-auto">
//                       {simulation.orderNumber}
//                     </Badge>
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="space-y-4">
//                     {simulation.tasks.map((task, index) => (
//                       <div key={task.id} className="relative">
//                         {/* Connection line */}
//                         {index < simulation.tasks.length - 1 && (
//                           <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300"></div>
//                         )}
                        
//                         <div className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
//                           task.status === 'completed' 
//                             ? 'bg-green-50 border-green-200' 
//                             : task.status === 'in_progress'
//                             ? 'bg-blue-50 border-blue-200'
//                             : task.status === 'lunch_break'
//                             ? 'bg-orange-50 border-orange-200'
//                             : 'bg-gray-50 border-gray-200'
//                         }`}>
//                           {/* Status Icon */}
//                           <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
//                             task.status === 'completed' 
//                               ? 'bg-green-100' 
//                               : task.status === 'in_progress'
//                               ? 'bg-blue-100 animate-pulse'
//                               : task.status === 'lunch_break'
//                               ? 'bg-orange-100'
//                               : 'bg-gray-100'
//                           }`}>
//                             {task.status === 'completed' ? (
//                               <CheckCircle className="w-6 h-6 text-green-600" />
//                             ) : task.status === 'lunch_break' ? (
//                               <Coffee className="w-6 h-6 text-orange-600" />
//                             ) : task.status === 'in_progress' ? (
//                               <Clock className="w-6 h-6 text-blue-600" />
//                             ) : (
//                               <Clock className="w-6 h-6 text-gray-400" />
//                             )}
//                           </div>
                          
//                           {/* Task Details */}
//                           <div className="flex-1">
//                             <div className="flex items-center justify-between mb-2">
//                               <h3 className="font-semibold text-gray-900">{task.taskName}</h3>
//                               <Badge variant={
//                                 task.status === 'completed' ? 'default' :
//                                 task.status === 'in_progress' ? 'secondary' :
//                                 task.status === 'lunch_break' ? 'outline' : 'outline'
//                               }>
//                                 {task.status === 'lunch_break' ? 'Lunch Break' : task.status.replace('_', ' ')}
//                               </Badge>
//                             </div>
                            
//                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
//                               <div>
//                                 <span className="text-gray-600">Assignee:</span>
//                                 <p className="font-medium">{task.doerEmail.split('@')[0]}</p>
//                               </div>
//                               <div>
//                                 <span className="text-gray-600">Start:</span>
//                                 <p className="font-medium">{format(task.startTime, 'HH:mm')}</p>
//                               </div>
//                               <div>
//                                 <span className="text-gray-600">Due:</span>
//                                 <p className="font-medium">{format(task.plannedEndTime, 'HH:mm')}</p>
//                               </div>
//                               <div>
//                                 <span className="text-gray-600">TAT:</span>
//                                 <p className="font-medium">{task.tat} {task.tatType.replace('tat', '')}</p>
//                               </div>
//                             </div>
                            
//                             {/* Enhanced Performance Metrics */}
//                             <div className="mt-3 p-3 bg-gray-50 rounded-lg">
//                               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
//                                 <div>
//                                   <span className="text-gray-500">Current Speed:</span>
//                                   <p className="font-medium text-blue-600">
//                                     {Math.round(calculateEffectiveSpeed(task.doerEmail, simulation.currentTime) * 100)}%
//                                   </p>
//                                 </div>
//                                 <div>
//                                   <span className="text-gray-500">Team Size:</span>
//                                   <p className="font-medium">{teamCount} {teamCount === 1 ? 'person' : 'people'}</p>
//                                 </div>
//                                 <div>
//                                   <span className="text-gray-500">Peak Impact:</span>
//                                   <p className={`font-medium ${isInPeakTime(simulation.currentTime) ? 'text-orange-600' : 'text-green-600'}`}>
//                                     {isInPeakTime(simulation.currentTime) ? `${peakSpeed}% (Peak)` : `${eventSpeed}% (Normal)`}
//                                   </p>
//                                 </div>
//                                 <div>
//                                   <span className="text-gray-500">User Speed:</span>
//                                   <p className="font-medium">
//                                     {userSpeedMultipliers[task.doerEmail] || 100}%
//                                   </p>
//                                 </div>
//                                 <div>
//                                   <span className="text-gray-500">Wait Time:</span>
//                                   <p className="font-medium text-yellow-600">{task.waitingTime.toFixed(1)}m</p>
//                                 </div>
//                                 <div>
//                                   <span className="text-gray-500">Process Time:</span>
//                                   <p className="font-medium text-green-600">{task.processingTime.toFixed(1)}m</p>
//                                 </div>
//                               </div>
//                             </div>
                            
//                             {/* Progress Bar */}
//                             {task.status === 'in_progress' && (
//                               <div className="mt-3">
//                                 <div className="flex justify-between text-xs text-gray-600 mb-1">
//                                   <span>Progress</span>
//                                   <span>{Math.round(Math.min(100, 
//                                     ((simulation.currentTime.getTime() - task.startTime.getTime()) / 
//                                     (task.plannedEndTime.getTime() - task.startTime.getTime())) * 100
//                                   ))}%</span>
//                                 </div>
//                                 <div className="w-full bg-gray-200 rounded-full h-2">
//                                   <div 
//                                     className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
//                                     style={{ 
//                                       width: `${Math.min(100, 
//                                         ((simulation.currentTime.getTime() - task.startTime.getTime()) / 
//                                         (task.plannedEndTime.getTime() - task.startTime.getTime())) * 100
//                                       )}%` 
//                                     }}
//                                   ></div>
//                                 </div>
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </CardContent>
//               </Card>

//               {/* Performance Summary */}
//               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                 <Card>
//                   <CardHeader>
//                     <CardTitle>Throughput Analysis</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="space-y-4">
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">Processing Time:</span>
//                         <span className="font-semibold text-green-600">
//                           {Math.round(simulation.tasks.reduce((sum, task) => sum + task.processingTime, 0))} min
//                         </span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">Queue Time:</span>
//                         <span className="font-semibold text-red-600">
//                           {Math.round(simulation.tasks.reduce((sum, task) => sum + task.waitingTime, 0))} min
//                         </span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">Lunch Breaks:</span>
//                         <span className="font-semibold text-orange-600">
//                           {simulation.tasks.filter(t => t.lunchBreakTaken).length} × 60 min
//                         </span>
//                       </div>
//                       <Separator />
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">Total Cycle Time:</span>
//                         <span className="font-semibold text-blue-600">
//                           {simulation.totalThroughputTime.toFixed(1)} hours
//                         </span>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>

//                 {/* Enhanced Performance Factors */}
//                 <Card>
//                   <CardHeader>
//                     <CardTitle className="flex items-center gap-2">
//                       <TrendingUp className="w-4 h-4" />
//                       Performance Factors
//                     </CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="space-y-3">
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">Base Speed:</span>
//                         <span className="font-semibold text-blue-600">{eventSpeed}%</span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">Team Benefit:</span>
//                         <span className="font-semibold text-green-600">
//                           {Math.round((1 + (teamCount - 1) * 0.3) * 100)}%
//                         </span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">Peak Impact:</span>
//                         <span className={`font-semibold ${isInPeakTime(simulation.currentTime) ? 'text-orange-600' : 'text-green-600'}`}>
//                           {isInPeakTime(simulation.currentTime) ? `${peakSpeed}% (Active)` : 'No Impact'}
//                         </span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">Current Period:</span>
//                         <span className="font-medium">
//                           {isInPeakTime(simulation.currentTime) ? '🔴 Peak Hours' : '🟢 Normal Hours'}
//                         </span>
//                       </div>
//                       <Separator />
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">Effective Speed:</span>
//                         <span className="font-semibold text-purple-600">
//                           {Math.round(simulation.tasks.reduce((avg, task) => 
//                             avg + calculateEffectiveSpeed(task.doerEmail, simulation.currentTime), 0
//                           ) / Math.max(1, simulation.tasks.length) * 100)}%
//                         </span>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
                
//                 <Card>
//                   <CardHeader>
//                     <CardTitle>Efficiency Metrics</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="space-y-4">
//                       <div className="text-center">
//                         <div className="text-3xl font-bold text-green-600 mb-1">
//                           {simulation.performance}%
//                         </div>
//                         <p className="text-gray-600">Overall Performance</p>
//                       </div>
                      
//                       <div className="grid grid-cols-2 gap-4 text-center">
//                         <div>
//                           <div className="text-xl font-semibold text-blue-600">
//                             {simulation.tasks.filter(t => t.status === 'completed').length}
//                           </div>
//                           <p className="text-xs text-gray-600">Tasks Completed</p>
//                         </div>
//                         <div>
//                           <div className="text-xl font-semibold text-orange-600">
//                             {simulation.tasks.filter(t => t.status !== 'completed').length}
//                           </div>
//                           <p className="text-xs text-gray-600">Tasks Pending</p>
//                         </div>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               </div>
//             </>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Users, 
  TrendingUp, 
  Activity,
  CheckCircle,
  AlertTriangle,
  Timer,
  Coffee,
  Settings,
  GitBranch
} from "lucide-react";
import { format, addHours, addMinutes, isAfter, isBefore, parseISO } from "date-fns";

interface SimulationTask {
  id: string;
  taskName: string;
  doerEmail: string;
  status: 'pending' | 'in_progress' | 'completed' | 'lunch_break';
  startTime: Date;
  plannedEndTime: Date;
  actualEndTime?: Date;
  tat: number;
  tatType: string;
  lunchBreakTaken: boolean;
  waitingTime: number; // Time spent waiting before starting
  processingTime: number; // Time spent actually working
}

interface DecisionPoint {
  taskName: string;
  availableStatuses: string[];
  waitingTime: number;
  isBottleneck: boolean;
  pathWeights: Record<string, number>; // Weight distribution for each path
  parallelPaths: SimulationTask[][]; // Parallel task paths created from decision
}

interface BottleneckAnalysis {
  slowestTask: string;
  avgWaitTime: number;
  efficiencyScore: number;
  recommendedActions: string[];
}

interface FlowNode {
  id: string;
  taskName: string;
  rules: any[];
  isDecisionPoint: boolean;
  visited: boolean;
  pathProbabilities: Record<string, number>;
}

interface FlowGraph {
  nodes: Map<string, FlowNode>;
  edges: Map<string, string[]>;
  startNode: string;
}

interface FlowPath {
  id: string;
  probability: number;
  tasks: SimulationTask[];
  isActive: boolean;
  pathName: string;
  pathNodes: string[];
}

interface FlowSimulation {
  flowId: string;
  system: string;
  orderNumber: string;
  description: string;
  tasks: SimulationTask[];
  parallelPaths: FlowPath[];
  currentTime: Date;
  isRunning: boolean;
  speed: number; // Simulation speed multiplier
  totalThroughputTime: number;
  completedTasks: number;
  performance: number;
  decisionPoints: DecisionPoint[];
  bottleneckAnalysis: BottleneckAnalysis | null;
  isPaused: boolean;
  pauseReason: string;
  visitedTasks: Set<string>; // Track visited tasks to prevent infinite loops
}

export default function FlowSimulator() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [simulation, setSimulation] = useState<FlowSimulation | null>(null);
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Enhanced simulation parameters
  const [eventSpeed, setEventSpeed] = useState<number>(100); // Normal processing speed percentage
  const [teamCount, setTeamCount] = useState<number>(1); // Number of people per task
  const [peakTimeStart, setPeakTimeStart] = useState<string>("10:00"); // Peak time start
  const [peakTimeEnd, setPeakTimeEnd] = useState<string>("16:00"); // Peak time end
  const [peakSpeed, setPeakSpeed] = useState<number>(60); // Reduced speed during peak time
  const [userSpeedMultipliers, setUserSpeedMultipliers] = useState<Record<string, number>>({}); // User-specific speeds

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

  const { data: flowRules, isLoading: rulesLoading } = useQuery({
    queryKey: ["/api/flow-rules"],
    enabled: isAuthenticated,
  });

  const { data: tatConfig } = useQuery({
    queryKey: ["/api/tat-config"],
    enabled: isAuthenticated,
  });

  // Get unique systems for simulation - handle different data formats
  const getAvailableSystems = (): string[] => {
    if (!flowRules) return [];
    
    let rulesArray: any[] = [];
    if (Array.isArray(flowRules)) {
      rulesArray = flowRules;
    } else if (flowRules && typeof flowRules === 'object') {
      // Extract array from different possible object structures
      rulesArray = (flowRules as any).rules || (flowRules as any).data || (flowRules as any).flowRules || [];
    }
    
    return Array.from(new Set(rulesArray.map(rule => rule.system).filter(Boolean)));
  };
  
  const availableSystems = getAvailableSystems();

  // Calculate path weights based on business logic
  const calculatePathWeights = (decisionRules: any[]): Record<string, number> => {
    const weights: Record<string, number> = {};
    const totalRules = decisionRules.length;
    
    // Default weights based on common business patterns
    decisionRules.forEach(rule => {
      const status = (rule.status || '').toLowerCase();
      let weight = 0.5; // Default 50%
      
      // Assign realistic business weights
      if (status.includes('approve') || status.includes('done') || status.includes('yes')) weight = 0.7;
      else if (status.includes('reject') || status.includes('cancel') || status.includes('no')) weight = 0.15;
      else if (status.includes('review') || status.includes('pending')) weight = 0.15;
      else if (status.includes('escalate') || status.includes('fail')) weight = 0.1;
      else if (status.includes('partial')) weight = 0.25;
      
      weights[rule.nextTask] = weight;
    });
    
    // Normalize weights to sum to 1.0
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    Object.keys(weights).forEach(key => {
      weights[key] = weights[key] / totalWeight;
    });
    
    return weights;
  };

  // Create parallel paths from decision point
  const createParallelPaths = (
    decisionRules: any[], 
    pathWeights: Record<string, number>, 
    startTime: Date, 
    systemRules: any[], 
    startCounter: number
  ): SimulationTask[][] => {
    const paths: SimulationTask[][] = [];
    let counter = startCounter;
    
    decisionRules.forEach((rule, index) => {
      const path: SimulationTask[] = [];
      let currentTask = rule.nextTask;
      let taskTime = new Date(startTime);
      
      // Create 2-3 tasks for each path to show parallel processing
      for (let i = 0; i < 3 && currentTask; i++) {
        const nextRule = systemRules.find(r => 
          r.currentTask === currentTask && r.status === "Done"
        );
        
        if (!nextRule) break;
        
        const taskEndTime = calculateTATWithEnhancements(taskTime, nextRule.tat, nextRule.tatType, nextRule.email);
        const pathTask: SimulationTask = {
          id: `sim-path-${index}-${counter++}`,
          taskName: `${rule.status}: ${nextRule.nextTask}`,
          doerEmail: nextRule.email,
          status: 'pending',
          startTime: new Date(taskTime),
          plannedEndTime: taskEndTime,
          tat: nextRule.tat,
          tatType: nextRule.tatType,
          lunchBreakTaken: false,
          waitingTime: Math.random() * 20 * (1 - pathWeights[rule.nextTask]), // Lower weight = more wait
          processingTime: 0
        };
        
        path.push(pathTask);
        currentTask = nextRule.nextTask;
        taskTime = new Date(taskEndTime);
      }
      
      if (path.length > 0) {
        paths.push(path);
      }
    });
    
    return paths;
  };

  // Analyze decision points in the selected system
  const analyzeDecisionPoints = (system: string, tasks: SimulationTask[]): DecisionPoint[] => {
    const systemRules = (flowRules as any[])?.filter(rule => rule.system === system) || [];
    const decisionPoints: DecisionPoint[] = [];
    
    // Find all tasks with multiple status flows
    const taskGroups = systemRules.reduce((acc, rule) => {
      if (!acc[rule.currentTask]) acc[rule.currentTask] = [];
      acc[rule.currentTask].push(rule);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.entries(taskGroups).forEach(([taskName, rules]) => {
      const typedRules = rules as any[];
      const statuses = new Set(typedRules.map((r: any) => r.status));
      if (statuses.size > 1) {
        const avgWaitTime = tasks
          .filter(t => t.taskName.includes(taskName))
          .reduce((sum, t) => sum + t.waitingTime, 0) / tasks.length || 30;
        
        const pathWeights = calculatePathWeights(typedRules);
        const parallelPaths = createParallelPaths(typedRules, pathWeights, new Date(), systemRules, 1);
        
        decisionPoints.push({
          taskName,
          availableStatuses: Array.from(statuses) as string[],
          waitingTime: avgWaitTime,
          isBottleneck: avgWaitTime > 45,
          pathWeights,
          parallelPaths
        });
      }
    });
    
    return decisionPoints;
  };

  // Analyze bottlenecks and productivity efficiency
  const analyzeBottlenecks = (tasks: SimulationTask[]): BottleneckAnalysis => {
    // Filter out the first task and decision tasks for accurate analysis
    const regularTasks = tasks.filter((task, index) => 
      index > 0 && !task.taskName.includes('Decision:')
    );
    
    if (regularTasks.length === 0) {
      return {
        slowestTask: "No regular tasks found",
        avgWaitTime: 0,
        efficiencyScore: 100,
        recommendedActions: []
      };
    }
    
    const taskTimes = regularTasks.map(task => {
      const duration = task.plannedEndTime.getTime() - task.startTime.getTime();
      const totalTaskTime = duration / (1000 * 60); // Convert to minutes
      const actualProcessingTime = task.processingTime || (totalTaskTime - task.waitingTime);
      
      return {
        taskName: task.taskName,
        duration: totalTaskTime,
        waitTime: task.waitingTime,
        processingTime: actualProcessingTime,
        efficiency: actualProcessingTime / totalTaskTime
      };
    });
    
    // Find slowest task by total duration (excluding first task)
    const slowestTask = taskTimes.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    );
    
    const avgWaitTime = taskTimes.reduce((sum, task) => sum + task.waitTime, 0) / taskTimes.length;
    const avgProcessingTime = taskTimes.reduce((sum, task) => sum + task.processingTime, 0) / taskTimes.length;
    const totalFlowTime = taskTimes.reduce((sum, task) => sum + task.duration, 0);
    const totalWorkingTime = taskTimes.reduce((sum, task) => sum + task.processingTime, 0);
    
    const efficiencyScore = Math.round((totalWorkingTime / totalFlowTime) * 100);
    
    const recommendedActions: string[] = [];
    if (avgWaitTime > 30) recommendedActions.push("Reduce waiting times between tasks");
    if (efficiencyScore < 70) recommendedActions.push("Optimize task processing efficiency");
    if (slowestTask.duration > 120) recommendedActions.push(`Focus on optimizing: ${slowestTask.taskName}`);
    if (avgWaitTime > avgProcessingTime) recommendedActions.push("Address workflow bottlenecks causing delays");
    
    return {
      slowestTask: slowestTask.taskName,
      avgWaitTime: Math.round(avgWaitTime),
      efficiencyScore,
      recommendedActions
    };
  };

  // Check if current time is in peak hours
  const isInPeakTime = (currentTime: Date): boolean => {
    const timeStr = format(currentTime, 'HH:mm');
    return timeStr >= peakTimeStart && timeStr <= peakTimeEnd;
  };

  // Calculate effective speed considering all factors
  const calculateEffectiveSpeed = (doerEmail: string, currentTime: Date): number => {
    let baseSpeed = eventSpeed / 100; // Convert percentage to multiplier
    
    // Apply peak time reduction
    if (isInPeakTime(currentTime)) {
      baseSpeed *= (peakSpeed / 100);
    }
    
    // User-specific speed removed as requested
    
    // Apply team count benefit (more people = faster completion, but with diminishing returns)
    const teamMultiplier = 1 + (teamCount - 1) * 0.3; // Each additional person adds 30% efficiency
    baseSpeed *= teamMultiplier;
    
    return Math.max(0.1, baseSpeed); // Minimum 10% speed to prevent infinite times
  };

  // Calculate TAT with all enhancement factors
  const calculateTATWithEnhancements = (startTime: Date, tat: number, tatType: string, doerEmail: string) => {
    const config = (tatConfig as any) || { officeStartHour: 9, officeEndHour: 18 };
    let baseEndTime = new Date(startTime);
    
    switch (tatType) {
      case 'hourtat':
        baseEndTime = addHours(startTime, tat);
        break;
      case 'daytat':
        baseEndTime = addHours(startTime, tat * 8); // 8 working hours per day
        break;
      case 'beforetat':
        // Complete before specific time (assumes next day at specified hour)
        baseEndTime = new Date(startTime);
        baseEndTime.setDate(baseEndTime.getDate() + 1);
        baseEndTime.setHours(config.officeStartHour + tat, 0, 0, 0);
        break;
      case 'specifytat':
        baseEndTime = addMinutes(startTime, tat * 60); // Assuming hours for specify
        break;
    }
    
    // Calculate effective duration considering speed factors
    const baseDurationMs = baseEndTime.getTime() - startTime.getTime();
    const effectiveSpeed = calculateEffectiveSpeed(doerEmail, startTime);
    const adjustedDurationMs = baseDurationMs / effectiveSpeed;
    
    let endTime = new Date(startTime.getTime() + adjustedDurationMs);
    
    // Add 1 hour lunch break if the task spans lunch time (12:00-13:00)
    const lunchStart = new Date(startTime);
    lunchStart.setHours(12, 0, 0, 0);
    const lunchEnd = new Date(startTime);
    lunchEnd.setHours(13, 0, 0, 0);
    
    if (isAfter(endTime, lunchStart) && isBefore(startTime, lunchEnd)) {
      endTime = addHours(endTime, 1); // Add lunch break
    }
    
    return endTime;
  };

  // Build flow graph from rules
  const buildFlowGraph = (systemRules: any[]): FlowGraph => {
    const nodes = new Map<string, FlowNode>();
    const edges = new Map<string, string[]>();
    
    // Create nodes for each unique task
    const allTasks = new Set<string>();
    systemRules.forEach(rule => {
      if (rule.currentTask) allTasks.add(rule.currentTask);
      if (rule.nextTask) allTasks.add(rule.nextTask);
    });
    
    allTasks.forEach(taskName => {
      const taskRules = systemRules.filter(rule => rule.currentTask === taskName);
      const isDecisionPoint = new Set(taskRules.map(r => r.status)).size > 1;
      
      nodes.set(taskName, {
        id: taskName,
        taskName,
        rules: taskRules,
        isDecisionPoint,
        visited: false,
        pathProbabilities: {}
      });
      
      edges.set(taskName, taskRules.map(r => r.nextTask).filter(Boolean));
    });
    
    const startRule = systemRules.find(rule => rule.currentTask === "");
    return {
      nodes,
      edges,
      startNode: startRule?.nextTask || ""
    };
  };

  // Advanced graph traversal with proper loop handling and decision resolution
  const generateComprehensivePaths = (graph: FlowGraph): FlowPath[] => {
    const allPaths: FlowPath[] = [];
    const maxDepth = 25; // Prevent infinite loops
    
    // Decision resolution strategies with comprehensive status mapping
    const decisionStrategies: Record<string, number> = {
      'completed': 0.7, 'rejected': 0.1, 'pending': 0.1,'hold':0.1,
      'pass': 0.8, 'fail': 0.2,
      'yes': 0.6, 'no': 0.4,
      'done': 0.9, 'partial': 0.1,
      'available': 0.7, 'not available': 0.3,
      'partial available': 0.2,
      'decline': 0.15, 'approved': 0.7,
      // Manufacturing specific statuses
      'material received': 0.8, 'material not received': 0.2,
      'quality check pass': 0.85, 'quality check fail': 0.15,
      'in inventory': 0.7, 'not in inventory': 0.3,
      'production complete': 0.9, 'production pending': 0.1
    };
    
    const traverseAllPaths = (
      currentNode: string,
      pathHistory: string[],
      loopCount: Map<string, number>,
      depth: number,
      pathId: string,
      baseProbability: number = 1.0
    ): void => {
      if (depth > maxDepth) return;
      
      const node = graph.nodes.get(currentNode);
      if (!node || !node.rules.length) return;
      
      // Track loop iterations
      const currentLoopCount = loopCount.get(currentNode) || 0;
      if (currentLoopCount > 3) return; // Limit loops to 3 iterations
      
      const newLoopCount = new Map(loopCount);
      newLoopCount.set(currentNode, currentLoopCount + 1);
      
      const newPathHistory = [...pathHistory, currentNode];
      
      if (node.isDecisionPoint && node.rules.length > 1) {
        // Handle decision points by exploring all branches
        node.rules.forEach((rule, branchIndex) => {
          if (!rule.nextTask) return;
          
          // Calculate branch probability based on status with safe access
          const statusKey = (rule.status || '').toLowerCase().trim();
          let branchProbability = decisionStrategies[statusKey];
          
          // If no exact match, try partial matching
          if (branchProbability === undefined) {
            const matchedKey = Object.keys(decisionStrategies).find(key => 
              statusKey.includes(key) || key.includes(statusKey)
            );
            branchProbability = matchedKey ? decisionStrategies[matchedKey] : 0.1;
          }
          
          // Adjust probability based on business logic
          const status = rule.status || '';
          if (status.includes('No') || status.includes('Fail') || status.includes('Decline')) {
            branchProbability *= 0.3; // Lower probability for failure paths
          } else if (status.includes('Done') || status.includes('Complete') || status.includes('Success')) {
            branchProbability = Math.max(branchProbability, 0.7); // Higher probability for success paths
          }
          
          const combinedProbability = baseProbability * branchProbability;
          const branchId = `${pathId}-${rule.status}-${branchIndex}`;
          
          // Continue traversal with this branch
          traverseAllPaths(
            rule.nextTask,
            newPathHistory,
            newLoopCount,
            depth + 1,
            branchId,
            combinedProbability
          );
        });
      } else {
        // Single path continuation
        const nextRule = node.rules.find(r => r.status === "Done" || r.status === "") || node.rules[0];
        
        if (nextRule?.nextTask) {
          traverseAllPaths(
            nextRule.nextTask,
            newPathHistory,
            newLoopCount,
            depth + 1,
            pathId,
            baseProbability
          );
        } else {
          // End of path - create flow path
          if (newPathHistory.length > 0) {
            const tasks = createDetailedTasksFromPath(newPathHistory, graph, baseProbability);
            
            allPaths.push({
              id: pathId,
              probability: baseProbability,
              tasks,
              isActive: baseProbability > 0.1,
              pathName: `${newPathHistory[0]} → ${newPathHistory[newPathHistory.length - 1]}`,
              pathNodes: newPathHistory
            });
          }
        }
      }
    };
    
    // Start traversal from the beginning
    if (graph.startNode) {
      traverseAllPaths(graph.startNode, [], new Map(), 0, "main", 1.0);
    }
    
    // Sort paths by probability and limit to top paths
    return allPaths
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 12); // Show top 12 most likely paths
  };

  // Create detailed simulation tasks with accurate timing
  const createDetailedTasksFromPath = (pathNodes: string[], graph: FlowGraph, pathProbability: number): SimulationTask[] => {
    const tasks: SimulationTask[] = [];
    let currentTime = new Date();
    
    pathNodes.forEach((nodeName, index) => {
      const node = graph.nodes.get(nodeName);
      if (!node || !node.rules.length) return;
      
      // Find the best rule to use for this node
      const rule = node.rules.find(r => r.email) || node.rules[0];
      if (!rule) return;
      
      // Calculate realistic wait time based on complexity and probability
      const complexityFactor = Math.max(0.5, 1 / pathProbability); // Lower probability = higher complexity
      const baseWaitTime = Math.random() * 30 * complexityFactor;
      
      // Peak time adjustments
      const isPeakTime = isInPeakTime(currentTime);
      const peakMultiplier = isPeakTime ? 1.5 : 1.0;
      const waitTime = baseWaitTime * peakMultiplier;
      
      // Calculate processing time with speed factors
      const effectiveSpeed = calculateEffectiveSpeed(rule.email || 'default@system.com', currentTime);
      const baseTATMinutes = (rule.tat || 1) * (rule.tatType === 'hourtat' ? 60 : 1440);
      const processingTime = baseTATMinutes / effectiveSpeed;
      
      // Account for lunch breaks
      const totalMinutes = waitTime + processingTime;
      let endTime = new Date(currentTime.getTime() + (totalMinutes * 60 * 1000));
      
      // Add lunch break if task spans lunch time
      const lunchStart = new Date(currentTime);
      lunchStart.setHours(12, 0, 0, 0);
      const lunchEnd = new Date(currentTime);
      lunchEnd.setHours(13, 0, 0, 0);
      
      let lunchBreakTaken = false;
      if (isAfter(endTime, lunchStart) && isBefore(currentTime, lunchEnd)) {
        endTime = addHours(endTime, 1);
        lunchBreakTaken = true;
      }
      
      const task: SimulationTask = {
        id: `path-task-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        taskName: nodeName,
        doerEmail: rule.email || 'system@workflow.com',
        status: 'pending',
        startTime: new Date(currentTime),
        plannedEndTime: endTime,
        tat: rule.tat || 1,
        tatType: rule.tatType || 'hourtat',
        lunchBreakTaken,
        waitingTime: Math.round(waitTime),
        processingTime: Math.round(processingTime)
      };
      
      tasks.push(task);
      currentTime = new Date(endTime);
    });
    
    return tasks;
  };

  // Create comprehensive simulation with graph-based approach
  const createComplexSimulation = (system: string): { tasks: SimulationTask[], parallelPaths: FlowPath[] } => {
    console.log('Flow Rules:', flowRules);
    console.log('Selected System:', system);
    
    // Handle both array and object formats of flowRules
    let rulesArray: any[] = [];
    if (Array.isArray(flowRules)) {
      rulesArray = flowRules;
    } else if (flowRules && typeof flowRules === 'object') {
      // If flowRules is an object, try to extract array from common property names
      rulesArray = (flowRules as any).rules || (flowRules as any).data || (flowRules as any).flowRules || [];
    }
    
    const systemRules = rulesArray.filter(rule => rule.system === system);
    console.log('Filtered System Rules:', systemRules);
    
    if (systemRules.length === 0) {
      console.log('No rules found for system:', system);
      console.log('Available systems:', rulesArray.map(r => r.system));
      return { tasks: [], parallelPaths: [] };
    }
    
    // Build flow graph
    const graph = buildFlowGraph(systemRules);
    console.log('Built graph:', graph);
    
    // Generate all comprehensive paths using the new engine
    const allPaths = generateComprehensivePaths(graph);
    console.log('Generated paths:', allPaths.length);
    
    if (allPaths.length === 0) {
      // Create a simple fallback path if no paths are generated
      const fallbackTasks = createFallbackTasks(systemRules);
      return { tasks: fallbackTasks, parallelPaths: [] };
    }
    
    // Main path is the highest probability path
    const mainPath = allPaths[0];
    const parallelPaths = allPaths.slice(1);
    
    return {
      tasks: mainPath?.tasks || [],
      parallelPaths: parallelPaths
    };
  };

  // Create fallback tasks when graph traversal fails
  const createFallbackTasks = (systemRules: any[]): SimulationTask[] => {
    const tasks: SimulationTask[] = [];
    let currentTime = new Date();
    
    // Find start rule
    const startRule = systemRules.find(rule => rule.currentTask === "" || rule.currentTask === null);
    if (!startRule) return tasks;
    
    // Create a simple linear path through the workflow
    let currentTask = startRule.nextTask;
    let stepCount = 0;
    const visitedTasks = new Set<string>();
    
    while (currentTask && stepCount < 10 && !visitedTasks.has(currentTask)) {
      visitedTasks.add(currentTask);
      stepCount++;
      
      // Find next rule for this task
      const nextRule = systemRules.find(rule => 
        rule.currentTask === currentTask && 
        (rule.status === "Done" || rule.status === "" || !rule.status)
      ) || systemRules.find(rule => rule.currentTask === currentTask);
      
      if (!nextRule) break;
      
      // Create task
      const waitTime = Math.random() * 30 + 10; // 10-40 minutes
      const processingTime = 60; // 1 hour default
      const endTime = new Date(currentTime.getTime() + ((waitTime + processingTime) * 60 * 1000));
      
      const task: SimulationTask = {
        id: `fallback-${stepCount}`,
        taskName: currentTask,
        doerEmail: nextRule.email || 'system@workflow.com',
        status: 'pending',
        startTime: new Date(currentTime),
        plannedEndTime: endTime,
        tat: nextRule.tat || 1,
        tatType: nextRule.tatType || 'hourtat',
        lunchBreakTaken: false,
        waitingTime: waitTime,
        processingTime: processingTime
      };
      
      tasks.push(task);
      currentTask = nextRule.nextTask;
      currentTime = new Date(endTime);
    }
    
    return tasks;
  };

  // Start simulation
  const startSimulation = () => {
    if (!selectedSystem) {
      toast({
        title: "Error",
        description: "Please select a system to simulate",
        variant: "destructive",
      });
      return;
    }
    
    const { tasks, parallelPaths } = createComplexSimulation(selectedSystem);
    if (tasks.length === 0) {
      toast({
        title: "Error", 
        description: `No flow rules found for system: ${selectedSystem}. Available systems: ${availableSystems.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    // Combine main tasks with all parallel path tasks for analysis
    const allTasks = [...tasks, ...parallelPaths.flatMap(path => path.tasks)];
    
    // Analyze bottlenecks and decision points
    const decisionPoints = analyzeDecisionPoints(selectedSystem, allTasks);
    const bottleneckAnalysis = analyzeBottlenecks(allTasks);
    
    const newSimulation: FlowSimulation = {
      flowId: `sim-flow-${Date.now()}`,
      system: selectedSystem,
      orderNumber: `SIM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      description: `Complex simulation of ${selectedSystem} workflow with ${parallelPaths.length} parallel paths`,
      tasks,
      parallelPaths,
      currentTime: new Date(),
      isRunning: true,
      speed: 60, // 60x speed (1 minute = 1 second)
      totalThroughputTime: 0,
      completedTasks: 0,
      performance: 0,
      decisionPoints,
      bottleneckAnalysis,
      isPaused: false,
      pauseReason: '',
      visitedTasks: new Set()
    };
    
    setSimulation(newSimulation);
    
    // Start simulation interval
    const interval = setInterval(() => {
      setSimulation(prev => {
        if (!prev || !prev.isRunning) return prev;
        
        const newCurrentTime = addMinutes(prev.currentTime, prev.speed);
        const updatedTasks = prev.tasks.map(task => {
          const newTask = { ...task };
          
          // Check if task should start
          if (task.status === 'pending' && !isAfter(task.startTime, newCurrentTime)) {
            newTask.status = 'in_progress';
            newTask.startTime = new Date(newCurrentTime);
          }
          
          // Check for lunch break (12:00-13:00)
          const lunchTime = new Date(newCurrentTime);
          lunchTime.setHours(12, 0, 0, 0);
          const lunchEnd = new Date(newCurrentTime);
          lunchEnd.setHours(13, 0, 0, 0);
          
          if (task.status === 'in_progress' && 
              newCurrentTime >= lunchTime && 
              newCurrentTime <= lunchEnd && 
              !task.lunchBreakTaken) {
            newTask.status = 'lunch_break';
            newTask.lunchBreakTaken = true;
          }
          
          // Resume from lunch
          if (task.status === 'lunch_break' && newCurrentTime > lunchEnd) {
            newTask.status = 'in_progress';
            // Extend planned end time by 1 hour for lunch
            newTask.plannedEndTime = addHours(newTask.plannedEndTime, 1);
          }
          
          // Check if task should complete
          if (task.status === 'in_progress' && !isAfter(task.plannedEndTime, newCurrentTime)) {
            newTask.status = 'completed';
            newTask.actualEndTime = new Date(newCurrentTime);
            newTask.processingTime = Math.max(0, 
              (newCurrentTime.getTime() - task.startTime.getTime()) / (1000 * 60) - 60 // Subtract lunch time
            );
          }
          
          return newTask;
        });
        
        const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
        const totalTime = updatedTasks.length > 0 ? 
          (newCurrentTime.getTime() - updatedTasks[0].startTime.getTime()) / (1000 * 60 * 60) : 0;
        
        // Check if all tasks are completed and stop simulation
        const allTasksCompleted = updatedTasks.length > 0 && completedCount === updatedTasks.length;
        
        return {
          ...prev,
          currentTime: newCurrentTime,
          tasks: updatedTasks,
          completedTasks: completedCount,
          totalThroughputTime: totalTime,
          performance: updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0,
          isRunning: !allTasksCompleted // Stop simulation when all tasks are completed
        };
      });
    }, 1000); // Update every second
    
    setSimulationInterval(interval);
    
    // Add completion notification
    const checkCompletion = setInterval(() => {
      if (simulation && !simulation.isRunning && simulation.completedTasks === simulation.tasks.length) {
        toast({
          title: "Simulation Complete",
          description: `All ${simulation.tasks.length} tasks have been completed successfully!`,
          variant: "default",
        });
        clearInterval(checkCompletion);
      }
    }, 2000);
    
    // Clean up completion checker after 30 seconds
    setTimeout(() => clearInterval(checkCompletion), 30000);
  };

  // Pause/Resume simulation
  const toggleSimulation = () => {
    setSimulation(prev => {
      if (!prev) return prev;
      
      if (prev.isRunning && simulationInterval) {
        clearInterval(simulationInterval);
        setSimulationInterval(null);
      } else if (!prev.isRunning) {
        startSimulation();
      }
      
      return { ...prev, isRunning: !prev.isRunning };
    });
  };

  // Reset simulation
  const resetSimulation = () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }
    setSimulation(null);
  };

  // Auto-stop simulation when all tasks are completed
  useEffect(() => {
    if (simulation && simulation.completedTasks === simulation.tasks.length && simulation.tasks.length > 0) {
      if (simulationInterval) {
        clearInterval(simulationInterval);
        setSimulationInterval(null);
      }
      
      // Show completion notification
      toast({
        title: "🎉 Simulation Complete!",
        description: `All ${simulation.tasks.length} tasks completed in ${simulation.totalThroughputTime.toFixed(1)} hours`,
        variant: "default",
      });
    }
  }, [simulation?.completedTasks, simulation?.tasks.length, simulationInterval, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
    };
  }, [simulationInterval]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="Flow Simulator" description="Simulate workflow execution with real-time visualization" />
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border h-64"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header title="Flow Simulator" description="Simulate workflow execution with real-time TAT calculations" />
        
        <div className="p-6 space-y-6">
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Simulation Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select system to simulate" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSystems.map((system: string) => (
                        <SelectItem key={system} value={system}>
                          {system}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  {!simulation ? (
                    <Button onClick={startSimulation} disabled={!selectedSystem}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Simulation
                    </Button>
                  ) : (
                    <>
                      <Button onClick={toggleSimulation} variant="outline">
                        {simulation.isRunning ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </>
                        )}
                      </Button>
                      <Button onClick={resetSimulation} variant="outline">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Simulation Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Event Speed */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Event Speed (%)
                  </label>
                  <Select value={eventSpeed.toString()} onValueChange={(value) => setEventSpeed(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50% - Slow</SelectItem>
                      <SelectItem value="75">75% - Below Average</SelectItem>
                      <SelectItem value="100">100% - Normal</SelectItem>
                      <SelectItem value="125">125% - Fast</SelectItem>
                      <SelectItem value="150">150% - Very Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Team Count */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Team Count per Task
                  </label>
                  <Select value={teamCount.toString()} onValueChange={(value) => setTeamCount(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Person</SelectItem>
                      <SelectItem value="2">2 People</SelectItem>
                      <SelectItem value="3">3 People</SelectItem>
                      <SelectItem value="4">4 People</SelectItem>
                      <SelectItem value="5">5 People</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Peak Time Start */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Peak Time Start
                  </label>
                  <Select value={peakTimeStart} onValueChange={setPeakTimeStart}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00">09:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="11:00">11:00 AM</SelectItem>
                      <SelectItem value="12:00">12:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Peak Time End */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Peak Time End
                  </label>
                  <Select value={peakTimeEnd} onValueChange={setPeakTimeEnd}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="14:00">02:00 PM</SelectItem>
                      <SelectItem value="15:00">03:00 PM</SelectItem>
                      <SelectItem value="16:00">04:00 PM</SelectItem>
                      <SelectItem value="17:00">05:00 PM</SelectItem>
                      <SelectItem value="18:00">06:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Peak Speed */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Speed in Peak Time (%)
                  </label>
                  <Select value={peakSpeed.toString()} onValueChange={(value) => setPeakSpeed(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="40">40% - Very Slow</SelectItem>
                      <SelectItem value="50">50% - Slow</SelectItem>
                      <SelectItem value="60">60% - Reduced</SelectItem>
                      <SelectItem value="70">70% - Slightly Reduced</SelectItem>
                      <SelectItem value="80">80% - Minor Impact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Simulation Speed Multiplier */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Simulation Speed
                  </label>
                  <Select value={(simulation?.speed || 1).toString()} onValueChange={(value) => {
                    setSimulation(prev => prev ? {...prev, speed: Number(value)} : null);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x - Real Time</SelectItem>
                      <SelectItem value="2">2x - Fast</SelectItem>
                      <SelectItem value="5">5x - Very Fast</SelectItem>
                      <SelectItem value="10">10x - Ultra Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>


            </CardContent>
          </Card>

          {simulation && (
            <>
              {/* Simulation Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Current Time</p>
                        <p className="font-semibold">{format(simulation.currentTime, 'HH:mm:ss')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Completed Tasks</p>
                        <p className="font-semibold">{simulation.completedTasks}/{simulation.tasks.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-sm text-gray-600">Performance</p>
                        <p className="font-semibold">{simulation.performance}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Throughput Time</p>
                        <p className="font-semibold">{simulation.totalThroughputTime.toFixed(1)}h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottleneck Analysis */}
              {simulation.bottleneckAnalysis && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="w-5 h-5" />
                      Productivity Efficiency Analysis
                      <Badge variant="secondary" className="ml-auto bg-orange-200">
                        {simulation.bottleneckAnalysis.efficiencyScore}% Efficient
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-3 rounded border">
                        <p className="text-sm text-gray-600">Slowest Task</p>
                        <p className="font-semibold text-orange-700">{simulation.bottleneckAnalysis.slowestTask}</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-sm text-gray-600">Avg Wait Time</p>
                        <p className="font-semibold text-orange-700">{simulation.bottleneckAnalysis.avgWaitTime} min</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-sm text-gray-600">Efficiency Score</p>
                        <p className="font-semibold text-orange-700">{simulation.bottleneckAnalysis.efficiencyScore}%</p>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600 mb-2">Recommended Actions:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {simulation.bottleneckAnalysis.recommendedActions.map((action, index) => (
                          <li key={index} className="text-sm text-orange-700">{action}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Decision Points Analysis */}
              {simulation.decisionPoints && simulation.decisionPoints.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      <Settings className="w-5 h-5" />
                      Decision Points & Bottlenecks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {simulation.decisionPoints.map((decision, index) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded border ${
                            decision.isBottleneck 
                              ? 'bg-red-100 border-red-300' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-sm">{decision.taskName}</h4>
                            {decision.isBottleneck && (
                              <Badge variant="destructive" className="text-xs">Bottleneck</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            Statuses: {decision.availableStatuses.join(', ')}
                          </p>
                          <p className="text-xs text-gray-600 mb-2">
                            Avg Wait: {Math.round(decision.waitingTime)} min
                          </p>
                          
                          {/* Path Weights */}
                          <div className="text-xs text-gray-700">
                            <p className="font-medium mb-1">Path Distribution:</p>
                            {Object.entries(decision.pathWeights).map(([path, weight]) => (
                              <div key={path} className="flex justify-between">
                                <span className="truncate flex-1">{path.substring(0, 20)}</span>
                                <span className="font-medium">{Math.round(weight * 100)}%</span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Parallel Paths Count */}
                          <div className="mt-2 text-xs text-blue-600">
                            {decision.parallelPaths.length} parallel paths created
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comprehensive Flow Analysis */}
              {simulation.parallelPaths && simulation.parallelPaths.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      <GitBranch className="w-5 h-5" />
                      Complete Workflow Analysis ({simulation.parallelPaths.length + 1} total paths)
                    </CardTitle>
                    <p className="text-sm text-blue-600">
                      Advanced flowchart simulation with loop detection and decision handling
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {simulation.parallelPaths
                        .sort((a, b) => b.probability - a.probability)
                        .slice(0, 8) // Show top 8 paths for better layout
                        .map((path, index) => (
                        <div 
                          key={path.id} 
                          className={`p-3 rounded border ${
                            path.isActive 
                              ? 'bg-green-100 border-green-300' 
                              : 'bg-gray-100 border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-xs truncate">{path.pathName}</h4>
                            <Badge variant={path.isActive ? "default" : "secondary"} className="text-xs shrink-0">
                              {Math.round(path.probability * 100)}%
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {path.tasks.length} tasks • {Math.round(path.tasks.reduce((sum, task) => 
                              sum + task.waitingTime + task.processingTime, 0
                            ))} min
                          </p>
                          <div className="text-xs text-blue-600 space-y-1">
                            {path.pathNodes && path.pathNodes.slice(0, 4).map((node, i) => (
                              <div key={i} className="truncate">
                                {i + 1}. {node}
                              </div>
                            ))}
                            {path.pathNodes && path.pathNodes.length > 4 && (
                              <div className="text-gray-500">...+{path.pathNodes.length - 4} more</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {simulation.parallelPaths.length > 8 && (
                      <p className="text-xs text-gray-500 mt-3">
                        Showing top 8 of {simulation.parallelPaths.length} possible workflow paths
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Flow Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Main Flow Timeline
                    <Badge variant="outline" className="ml-auto">
                      {simulation.orderNumber}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {simulation.tasks.map((task, index) => (
                      <div key={task.id} className="relative">
                        {/* Connection line */}
                        {index < simulation.tasks.length - 1 && (
                          <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300"></div>
                        )}
                        
                        <div className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                          task.status === 'completed' 
                            ? 'bg-green-50 border-green-200' 
                            : task.status === 'in_progress'
                            ? 'bg-blue-50 border-blue-200'
                            : task.status === 'lunch_break'
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          {/* Status Icon */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            task.status === 'completed' 
                              ? 'bg-green-100' 
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 animate-pulse'
                              : task.status === 'lunch_break'
                              ? 'bg-orange-100'
                              : 'bg-gray-100'
                          }`}>
                            {task.status === 'completed' ? (
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            ) : task.status === 'lunch_break' ? (
                              <Coffee className="w-6 h-6 text-orange-600" />
                            ) : task.status === 'in_progress' ? (
                              <Clock className="w-6 h-6 text-blue-600" />
                            ) : (
                              <Clock className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          
                          {/* Task Details */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900">{task.taskName}</h3>
                              <Badge variant={
                                task.status === 'completed' ? 'default' :
                                task.status === 'in_progress' ? 'secondary' :
                                task.status === 'lunch_break' ? 'outline' : 'outline'
                              }>
                                {task.status === 'lunch_break' ? 'Lunch Break' : task.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Assignee:</span>
                                <p className="font-medium">{task.doerEmail.split('@')[0]}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Start:</span>
                                <p className="font-medium">{format(task.startTime, 'HH:mm')}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Due:</span>
                                <p className="font-medium">{format(task.plannedEndTime, 'HH:mm')}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">TAT:</span>
                                <p className="font-medium">{task.tat} {task.tatType.replace('tat', '')}</p>
                              </div>
                            </div>
                            
                            {/* Enhanced Performance Metrics */}
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <span className="text-gray-500">Current Speed:</span>
                                  <p className="font-medium text-blue-600">
                                    {Math.round(calculateEffectiveSpeed(task.doerEmail, simulation.currentTime) * 100)}%
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Team Size:</span>
                                  <p className="font-medium">{teamCount} {teamCount === 1 ? 'person' : 'people'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Peak Impact:</span>
                                  <p className={`font-medium ${isInPeakTime(simulation.currentTime) ? 'text-orange-600' : 'text-green-600'}`}>
                                    {isInPeakTime(simulation.currentTime) ? `${peakSpeed}% (Peak)` : `${eventSpeed}% (Normal)`}
                                  </p>
                                </div>

                                <div>
                                  <span className="text-gray-500">Wait Time:</span>
                                  <p className="font-medium text-yellow-600">{task.waitingTime.toFixed(1)}m</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Process Time:</span>
                                  <p className="font-medium text-green-600">{task.processingTime.toFixed(1)}m</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            {task.status === 'in_progress' && (
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>Progress</span>
                                  <span>{Math.round(Math.min(100, 
                                    ((simulation.currentTime.getTime() - task.startTime.getTime()) / 
                                    (task.plannedEndTime.getTime() - task.startTime.getTime())) * 100
                                  ))}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                                    style={{ 
                                      width: `${Math.min(100, 
                                        ((simulation.currentTime.getTime() - task.startTime.getTime()) / 
                                        (task.plannedEndTime.getTime() - task.startTime.getTime())) * 100
                                      )}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Throughput Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Processing Time:</span>
                        <span className="font-semibold text-green-600">
                          {Math.round(simulation.tasks.reduce((sum, task) => sum + task.processingTime, 0))} min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Queue Time:</span>
                        <span className="font-semibold text-red-600">
                          {Math.round(simulation.tasks.reduce((sum, task) => sum + task.waitingTime, 0))} min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lunch Breaks:</span>
                        <span className="font-semibold text-orange-600">
                          {simulation.tasks.filter(t => t.lunchBreakTaken).length} × 60 min
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Cycle Time:</span>
                        <span className="font-semibold text-blue-600">
                          {simulation.totalThroughputTime.toFixed(1)} hours
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enhanced Performance Factors */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Performance Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Speed:</span>
                        <span className="font-semibold text-blue-600">{eventSpeed}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Team Benefit:</span>
                        <span className="font-semibold text-green-600">
                          {Math.round((1 + (teamCount - 1) * 0.3) * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Peak Impact:</span>
                        <span className={`font-semibold ${isInPeakTime(simulation.currentTime) ? 'text-orange-600' : 'text-green-600'}`}>
                          {isInPeakTime(simulation.currentTime) ? `${peakSpeed}% (Active)` : 'No Impact'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Period:</span>
                        <span className="font-medium">
                          {isInPeakTime(simulation.currentTime) ? '🔴 Peak Hours' : '🟢 Normal Hours'}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-gray-600">Effective Speed:</span>
                        <span className="font-semibold text-purple-600">
                          {Math.round(simulation.tasks.reduce((avg, task) => 
                            avg + calculateEffectiveSpeed(task.doerEmail, simulation.currentTime), 0
                          ) / Math.max(1, simulation.tasks.length) * 100)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Efficiency Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {simulation.performance}%
                        </div>
                        <p className="text-gray-600">Overall Performance</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-xl font-semibold text-blue-600">
                            {simulation.tasks.filter(t => t.status === 'completed').length}
                          </div>
                          <p className="text-xs text-gray-600">Tasks Completed</p>
                        </div>
                        <div>
                          <div className="text-xl font-semibold text-orange-600">
                            {simulation.tasks.filter(t => t.status !== 'completed').length}
                          </div>
                          <p className="text-xs text-gray-600">Tasks Pending</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}