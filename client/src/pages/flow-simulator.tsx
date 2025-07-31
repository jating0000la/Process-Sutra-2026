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
  Coffee
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

interface FlowSimulation {
  flowId: string;
  system: string;
  orderNumber: string;
  description: string;
  tasks: SimulationTask[];
  currentTime: Date;
  isRunning: boolean;
  speed: number; // Simulation speed multiplier
  totalThroughputTime: number;
  completedTasks: number;
  performance: number;
}

export default function FlowSimulator() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [simulation, setSimulation] = useState<FlowSimulation | null>(null);
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);

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

  // Get unique systems for simulation
  const availableSystems = Array.from(new Set((flowRules as any[])?.map(rule => rule.system) || []));

  // Calculate TAT with lunch break consideration
  const calculateTATWithLunch = (startTime: Date, tat: number, tatType: string) => {
    const config = (tatConfig as any) || { officeStartHour: 9, officeEndHour: 18 };
    let endTime = new Date(startTime);
    
    switch (tatType) {
      case 'hourtat':
        endTime = addHours(startTime, tat);
        break;
      case 'daytat':
        endTime = addHours(startTime, tat * 8); // 8 working hours per day
        break;
      case 'beforetat':
        // Complete before specific time (assumes next day at specified hour)
        endTime = new Date(startTime);
        endTime.setDate(endTime.getDate() + 1);
        endTime.setHours(config.officeStartHour + tat, 0, 0, 0);
        break;
      case 'specifytat':
        endTime = addMinutes(startTime, tat * 60); // Assuming hours for specify
        break;
    }
    
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

  // Create simulation tasks from flow rules
  const createSimulationTasks = (system: string): SimulationTask[] => {
    const systemRules = (flowRules as any[])?.filter(rule => rule.system === system) || [];
    const startRule = systemRules.find(rule => rule.currentTask === "");
    
    if (!startRule) return [];
    
    const tasks: SimulationTask[] = [];
    const currentTime = new Date();
    let taskTime = new Date(currentTime);
    
    // Create first task
    const firstTaskEndTime = calculateTATWithLunch(taskTime, startRule.tat, startRule.tatType);
    const firstTask: SimulationTask = {
      id: `sim-${Date.now()}-1`,
      taskName: startRule.nextTask,
      doerEmail: startRule.email,
      status: 'pending',
      startTime: new Date(taskTime),
      plannedEndTime: firstTaskEndTime,
      tat: startRule.tat,
      tatType: startRule.tatType,
      lunchBreakTaken: false,
      waitingTime: 0,
      processingTime: 0
    };
    tasks.push(firstTask);
    
    // Create subsequent tasks based on completion flow
    let currentTask = startRule.nextTask;
    let taskCounter = 2;
    taskTime = new Date(firstTaskEndTime);
    
    while (tasks.length < 10 && currentTask) { // Limit to 10 tasks for simulation
      const nextRule = systemRules.find(rule => 
        rule.currentTask === currentTask && rule.status === "Done"
      );
      
      if (!nextRule) break;
      
      const taskEndTime = calculateTATWithLunch(taskTime, nextRule.tat, nextRule.tatType);
      const nextTask: SimulationTask = {
        id: `sim-${Date.now()}-${taskCounter}`,
        taskName: nextRule.nextTask,
        doerEmail: nextRule.email,
        status: 'pending',
        startTime: new Date(taskTime),
        plannedEndTime: taskEndTime,
        tat: nextRule.tat,
        tatType: nextRule.tatType,
        lunchBreakTaken: false,
        waitingTime: Math.random() * 30, // Random wait time 0-30 minutes
        processingTime: 0
      };
      tasks.push(nextTask);
      
      currentTask = nextRule.nextTask;
      taskTime = new Date(taskEndTime);
      taskCounter++;
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
    
    const tasks = createSimulationTasks(selectedSystem);
    if (tasks.length === 0) {
      toast({
        title: "Error",
        description: "No flow rules found for this system",
        variant: "destructive",
      });
      return;
    }
    
    const newSimulation: FlowSimulation = {
      flowId: `sim-flow-${Date.now()}`,
      system: selectedSystem,
      orderNumber: `SIM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      description: `Simulation of ${selectedSystem} workflow`,
      tasks,
      currentTime: new Date(),
      isRunning: true,
      speed: 60, // 60x speed (1 minute = 1 second)
      totalThroughputTime: 0,
      completedTasks: 0,
      performance: 0
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
        
        return {
          ...prev,
          currentTime: newCurrentTime,
          tasks: updatedTasks,
          completedTasks: completedCount,
          totalThroughputTime: totalTime,
          performance: updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0
        };
      });
    }, 1000); // Update every second
    
    setSimulationInterval(interval);
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

              {/* Flow Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Flow Execution Timeline
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Throughput Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Processing Time:</span>
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