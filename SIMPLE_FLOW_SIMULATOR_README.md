# Simple Flow Simulator

A business process simulation tool inspired by [BP Simulator](https://www.bpsimulator.com/), designed to help analyze and optimize workflow efficiency in Process-Sutra.

## 🎯 Purpose

The Simple Flow Simulator provides an easy-to-use interface for:
1. **Process Mapping** - Visualize your workflow structure
2. **Business Improvement** - Identify bottlenecks and optimization opportunities
3. **Activity-Based Costing** - Calculate the cost of executing workflows

## 🚀 Key Features

### Design Phase
- **System Selection**: Choose from available workflow systems
- **Process Preview**: View all tasks in the workflow with durations
- **Configuration**: Set team size, cost per hour, and work hours per day
- **Simple Setup**: Initialize simulation with one click

### Simulation Phase
- **Real-Time Execution**: Watch tasks execute in real-time
- **Adjustable Speed**: Control simulation speed (1x to 50x)
- **Visual Progress**: Track completion with progress bars and status indicators
- **Task States**: 
  - ⏳ Pending (gray)
  - ⚡ Running (blue, animated)
  - ✅ Completed (green)

### Analysis Phase
- **Key Metrics Dashboard**:
  - Total Time: Overall workflow duration
  - Throughput: Tasks completed per hour
  - Utilization: Resource efficiency percentage
  - Total Cost: Calculated based on team size and hourly rate

- **Bottleneck Analysis**: 
  - Identifies top 3 longest-running tasks
  - Provides optimization recommendations
  - Highlights high-priority improvement areas

- **Performance Insights**:
  - Resource utilization visualization
  - Average task duration
  - Cost per task breakdown
  - Team efficiency metrics

- **Optimization Recommendations**:
  - Process improvement suggestions
  - Resource optimization strategies
  - Best practices for workflow efficiency

## 📊 How It Works

### 1. Design Your Process
```
1. Select a workflow system from the dropdown
2. Configure simulation parameters:
   - Team Size (1-50 people)
   - Cost per Hour ($)
   - Work Hours per Day (1-24)
3. Click "Initialize Simulation"
```

### 2. Run Simulation
```
1. Click "Start" to begin simulation
2. Adjust speed using the speed selector (1x - 50x)
3. Watch tasks execute in sequence
4. Pause/Resume as needed
5. Reset to start over
```

### 3. Analyze Results
```
1. View key metrics in dashboard cards
2. Check bottleneck analysis for improvement areas
3. Review performance insights
4. Read optimization recommendations
```

## 🎨 User Interface

### Tabs Structure
- **Design** (🔧): Configure and initialize simulation
- **Simulation** (▶️): Run and monitor execution
- **Analysis** (📊): View results and insights

### Color Coding
- 🔵 Blue: Information, Running tasks
- 🟢 Green: Success, Completed tasks, Performance metrics
- 🟠 Orange: Warnings, Bottlenecks, Cost metrics
- ⚫ Gray: Pending tasks
- 🟣 Purple: Resource utilization

## 📈 Metrics Explained

### Total Time
Total hours required to complete all tasks in the workflow. Calculated based on task durations and team efficiency.

### Throughput
Number of tasks completed per hour. Higher throughput indicates better process efficiency.

### Utilization
Percentage of effective resource usage. Shows how efficiently the team is being utilized.
- < 70%: Room for improvement
- 70-85%: Good utilization
- > 85%: Excellent utilization

### Total Cost
Calculated as: `Total Hours × Team Size × Cost per Hour`

### Bottlenecks
Tasks that take the longest time to complete. These are prime candidates for:
- Process automation
- Additional resource allocation
- Workflow restructuring

## 🔄 Workflow Integration

The simulator integrates with Process-Sutra's flow rules:
- Automatically loads task sequences from flow configurations
- Respects TAT (Turn Around Time) settings
- Uses actual assignee information
- Calculates realistic durations based on task types

## 🎯 Use Cases

1. **Process Optimization**: Identify and eliminate bottlenecks
2. **Resource Planning**: Determine optimal team size for workflows
3. **Cost Analysis**: Calculate and optimize workflow costs
4. **What-If Analysis**: Test different configurations before implementation
5. **Training**: Demonstrate workflow execution to new team members
6. **Process Documentation**: Visualize complete workflow sequences

## 🛠️ Technical Details

### Built With
- React + TypeScript
- Shadcn UI Components
- Lucide Icons
- Date-fns for time calculations
- Tanstack Query for data fetching

### Simulation Logic
- Sequential task execution
- Configurable speed multiplier
- Real-time state updates
- Automatic completion detection

## 🔗 Access

**URL**: `/simple-flow-simulator`

**Requirements**: Admin access required

## 📝 Comparison with BP Simulator

| Feature | BP Simulator | Simple Flow Simulator |
|---------|-------------|----------------------|
| Process Mapping | ✅ Visual BPMN | ✅ Rule-based mapping |
| Simulation | ✅ Discrete event | ✅ Sequential execution |
| Analysis | ✅ Comprehensive | ✅ Key metrics + bottlenecks |
| Cost Calculation | ✅ Activity-based | ✅ Team-based |
| Integration | ❌ Standalone | ✅ Process-Sutra native |
| Setup Time | Medium | Fast |
| Learning Curve | Moderate | Easy |

## 🚀 Future Enhancements

- [ ] Parallel task execution
- [ ] Monte Carlo simulation for uncertainty
- [ ] Historical data comparison
- [ ] Export reports to PDF/CSV
- [ ] Custom task duration overrides
- [ ] Resource constraints modeling
- [ ] Multiple simulation runs comparison
- [ ] Graphical workflow visualization

## 📞 Support

For issues or feature requests related to the Simple Flow Simulator, please contact the development team or create an issue in the repository.

---

**Created**: October 2025  
**Version**: 1.0.0  
**Status**: Active Development
