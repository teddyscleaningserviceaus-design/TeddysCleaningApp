import { getEmployeeTravelTime } from './travelTimeService';

/**
 * Smart Task Assignment Service
 * Assigns tasks to employees based on:
 * - Job type and building type
 * - Employee skills and equipment
 * - Distance from job site
 * - Current workload
 * - Employee availability
 */

// Task templates based on job type and building type
const TASK_TEMPLATES = {
  'office-cleaning': {
    'small-office': [
      { 
        title: 'Empty trash bins and replace liners', 
        priority: 'High', 
        estimatedTime: 15, 
        skills: ['basic'],
        description: 'Empty all waste bins and replace with fresh liners',
        instructions: 'Empty bins into main waste container, wipe bin edges, insert fresh liner, sanitize hands',
        equipment: ['trash bags', 'sanitizer', 'gloves'],
        videoLinks: ['https://example.com/office-waste-management']
      },
      { 
        title: 'Vacuum carpeted areas', 
        priority: 'High', 
        estimatedTime: 20, 
        skills: ['basic'], 
        equipment: ['vacuum'],
        description: 'Thoroughly vacuum all carpeted areas and rugs',
        instructions: 'Check vacuum bag/filter, start from corners, overlap strokes, use attachments for edges',
        videoLinks: ['https://example.com/commercial-vacuuming']
      },
      { 
        title: 'Mop hard floors', 
        priority: 'High', 
        estimatedTime: 15, 
        skills: ['basic'], 
        equipment: ['mop'],
        description: 'Clean and mop all hard floor surfaces',
        instructions: 'Sweep first, prepare cleaning solution, mop from far corner toward exit, change water if dirty',
        videoLinks: ['https://example.com/professional-mopping']
      },
      { 
        title: 'Clean and sanitize restrooms', 
        priority: 'High', 
        estimatedTime: 25, 
        skills: ['sanitization'],
        description: 'Complete restroom cleaning and sanitization',
        instructions: 'Apply cleaners, scrub toilet/sink/mirror, mop floor, restock supplies, sanitize handles',
        equipment: ['toilet brush', 'all-purpose cleaner', 'paper towels', 'sanitizer'],
        videoLinks: ['https://example.com/restroom-cleaning-protocol']
      },
      { 
        title: 'Dust desks and surfaces', 
        priority: 'Medium', 
        estimatedTime: 20, 
        skills: ['basic'],
        description: 'Dust all desk surfaces and office furniture',
        instructions: 'Use microfiber cloth, work top to bottom, move items carefully, use spray sparingly',
        equipment: ['microfiber cloths', 'dusting spray'],
        videoLinks: ['https://example.com/office-dusting-techniques']
      },
      { 
        title: 'Clean windows and glass surfaces', 
        priority: 'Low', 
        estimatedTime: 15, 
        skills: ['window-cleaning'],
        description: 'Clean interior windows and glass partitions',
        instructions: 'Spray glass cleaner, wipe in circular motion, use squeegee for large surfaces, check for streaks',
        equipment: ['glass cleaner', 'squeegee', 'lint-free cloths'],
        videoLinks: ['https://example.com/streak-free-windows']
      },
      { 
        title: 'Sanitize high-touch surfaces', 
        priority: 'High', 
        estimatedTime: 10, 
        skills: ['sanitization'],
        description: 'Sanitize door handles, light switches, and frequently touched areas',
        instructions: 'Identify high-touch points, apply sanitizer, let dwell time, wipe clean',
        equipment: ['sanitizer', 'disposable wipes'],
        videoLinks: ['https://example.com/high-touch-sanitization']
      }
    ],
    'large-office': [
      { title: 'Empty trash bins and replace liners', priority: 'High', estimatedTime: 30, skills: ['basic'] },
      { title: 'Vacuum carpeted areas', priority: 'High', estimatedTime: 45, skills: ['basic'], equipment: ['vacuum'] },
      { title: 'Mop hard floors and hallways', priority: 'High', estimatedTime: 35, skills: ['basic'], equipment: ['mop'] },
      { title: 'Clean and sanitize restrooms', priority: 'High', estimatedTime: 40, skills: ['sanitization'] },
      { title: 'Dust desks and workstations', priority: 'Medium', estimatedTime: 35, skills: ['basic'] },
      { title: 'Clean conference rooms', priority: 'Medium', estimatedTime: 25, skills: ['basic'] },
      { title: 'Clean kitchen/break room', priority: 'High', estimatedTime: 20, skills: ['kitchen-cleaning'] },
      { title: 'Clean windows and glass surfaces', priority: 'Low', estimatedTime: 30, skills: ['window-cleaning'] },
      { title: 'Sanitize high-touch surfaces', priority: 'High', estimatedTime: 20, skills: ['sanitization'] }
    ]
  },
  'residential-cleaning': {
    'apartment': [
      { title: 'Vacuum all carpeted areas', priority: 'High', estimatedTime: 20, skills: ['basic'], equipment: ['vacuum'] },
      { title: 'Mop kitchen and bathroom floors', priority: 'High', estimatedTime: 15, skills: ['basic'], equipment: ['mop'] },
      { title: 'Clean and sanitize bathroom', priority: 'High', estimatedTime: 25, skills: ['sanitization'] },
      { title: 'Clean kitchen counters and appliances', priority: 'High', estimatedTime: 20, skills: ['kitchen-cleaning'] },
      { title: 'Dust living areas', priority: 'Medium', estimatedTime: 15, skills: ['basic'] },
      { title: 'Clean windows', priority: 'Low', estimatedTime: 10, skills: ['window-cleaning'] },
      { title: 'Empty trash and replace liners', priority: 'Medium', estimatedTime: 5, skills: ['basic'] }
    ],
    'house': [
      { title: 'Vacuum all carpeted areas', priority: 'High', estimatedTime: 35, skills: ['basic'], equipment: ['vacuum'] },
      { title: 'Mop hard floors throughout house', priority: 'High', estimatedTime: 30, skills: ['basic'], equipment: ['mop'] },
      { title: 'Clean and sanitize all bathrooms', priority: 'High', estimatedTime: 45, skills: ['sanitization'] },
      { title: 'Clean kitchen thoroughly', priority: 'High', estimatedTime: 35, skills: ['kitchen-cleaning'] },
      { title: 'Dust all rooms and surfaces', priority: 'Medium', estimatedTime: 30, skills: ['basic'] },
      { title: 'Clean windows throughout house', priority: 'Low', estimatedTime: 25, skills: ['window-cleaning'] },
      { title: 'Empty all trash bins', priority: 'Medium', estimatedTime: 10, skills: ['basic'] },
      { title: 'Clean laundry room', priority: 'Low', estimatedTime: 15, skills: ['basic'] }
    ]
  },
  'deep-cleaning': {
    'any': [
      { title: 'Deep vacuum including under furniture', priority: 'High', estimatedTime: 45, skills: ['deep-cleaning'], equipment: ['vacuum'] },
      { title: 'Scrub and mop all floors', priority: 'High', estimatedTime: 40, skills: ['deep-cleaning'], equipment: ['mop', 'scrubber'] },
      { title: 'Deep clean bathrooms including grout', priority: 'High', estimatedTime: 60, skills: ['deep-cleaning', 'sanitization'] },
      { title: 'Deep clean kitchen including appliances', priority: 'High', estimatedTime: 50, skills: ['deep-cleaning', 'kitchen-cleaning'] },
      { title: 'Dust and wipe all surfaces thoroughly', priority: 'High', estimatedTime: 35, skills: ['deep-cleaning'] },
      { title: 'Clean all windows inside and out', priority: 'Medium', estimatedTime: 40, skills: ['window-cleaning'] },
      { title: 'Clean light fixtures and ceiling fans', priority: 'Medium', estimatedTime: 25, skills: ['deep-cleaning'] },
      { title: 'Organize and clean storage areas', priority: 'Low', estimatedTime: 30, skills: ['organizing'] }
    ]
  },
  'post-construction': {
    'any': [
      { title: 'Remove construction debris', priority: 'High', estimatedTime: 60, skills: ['construction-cleanup'], equipment: ['heavy-duty-vacuum'] },
      { title: 'Deep vacuum with HEPA filter', priority: 'High', estimatedTime: 45, skills: ['construction-cleanup'], equipment: ['hepa-vacuum'] },
      { title: 'Scrub floors to remove residue', priority: 'High', estimatedTime: 50, skills: ['construction-cleanup'], equipment: ['scrubber'] },
      { title: 'Clean windows and remove stickers', priority: 'High', estimatedTime: 35, skills: ['window-cleaning', 'construction-cleanup'] },
      { title: 'Dust removal from all surfaces', priority: 'High', estimatedTime: 40, skills: ['construction-cleanup'] },
      { title: 'Clean and sanitize bathrooms', priority: 'High', estimatedTime: 30, skills: ['sanitization'] },
      { title: 'Final detail cleaning', priority: 'Medium', estimatedTime: 25, skills: ['construction-cleanup'] }
    ]
  }
};

// Employee skill matching
const SKILL_HIERARCHY = {
  'basic': 1,
  'sanitization': 2,
  'kitchen-cleaning': 2,
  'window-cleaning': 2,
  'deep-cleaning': 3,
  'construction-cleanup': 4,
  'organizing': 2
};

/**
 * Generate tasks based on job type and building type
 */
export const generateTasksForJob = (jobType, buildingType) => {
  const normalizedJobType = jobType?.toLowerCase().replace(/\s+/g, '-') || 'office-cleaning';
  const normalizedBuildingType = buildingType?.toLowerCase().replace(/\s+/g, '-') || 'small-office';
  
  let tasks = [];
  
  // Get tasks from template
  if (TASK_TEMPLATES[normalizedJobType]) {
    if (TASK_TEMPLATES[normalizedJobType][normalizedBuildingType]) {
      tasks = TASK_TEMPLATES[normalizedJobType][normalizedBuildingType];
    } else if (TASK_TEMPLATES[normalizedJobType]['any']) {
      tasks = TASK_TEMPLATES[normalizedJobType]['any'];
    }
  }
  
  // Fallback to basic office cleaning if no template found
  if (tasks.length === 0) {
    tasks = TASK_TEMPLATES['office-cleaning']['small-office'];
  }
  
  // Add unique IDs and default values
  return tasks.map((task, index) => ({
    id: `task_${Date.now()}_${index}`,
    ...task,
    assignedTo: null,
    assignedToName: null,
    completed: false,
    order: index + 1,
    // Ensure all fields have defaults
    description: task.description || task.title,
    instructions: task.instructions || 'Follow standard procedures for this task',
    equipment: task.equipment || [],
    videoLinks: task.videoLinks || [],
    priority: task.priority || 'Medium'
  }));
};

/**
 * Calculate employee suitability score for a task
 */
const calculateEmployeeSuitability = async (employee, task, job) => {
  let score = 0;
  
  // Skill matching (40% of score)
  const requiredSkills = task.skills || ['basic'];
  const employeeSkills = employee.skills || ['basic'];
  
  let skillMatch = 0;
  requiredSkills.forEach(skill => {
    if (employeeSkills.includes(skill)) {
      skillMatch += SKILL_HIERARCHY[skill] || 1;
    }
  });
  score += (skillMatch / requiredSkills.length) * 40;
  
  // Equipment availability (20% of score)
  const requiredEquipment = task.equipment || [];
  const employeeEquipment = employee.equipment || [];
  
  if (requiredEquipment.length > 0) {
    const equipmentMatch = requiredEquipment.filter(eq => 
      employeeEquipment.some(empEq => empEq.toLowerCase().includes(eq.toLowerCase()))
    ).length;
    score += (equipmentMatch / requiredEquipment.length) * 20;
  } else {
    score += 20; // No equipment required
  }
  
  // Distance/travel time (25% of score)
  try {
    const travelInfo = await getEmployeeTravelTime(employee, job);
    if (travelInfo && travelInfo.duration) {
      const travelMinutes = travelInfo.duration.value / 60;
      // Score decreases as travel time increases (max 60 minutes for 0 points)
      const distanceScore = Math.max(0, (60 - travelMinutes) / 60) * 25;
      score += distanceScore;
    } else {
      score += 10; // Default if no travel info available
    }
  } catch (error) {
    score += 10; // Default if travel calculation fails
  }
  
  // Availability and workload (15% of score)
  const availability = getEmployeeAvailability(employee);
  score += availability.score * 15;
  
  return Math.min(100, Math.max(0, score));
};

/**
 * Get employee availability score
 */
const getEmployeeAvailability = (employee) => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  
  // Check if employee is inactive
  if (employee.status === 'inactive' || employee.status === 'unavailable') {
    return { score: 0, reason: 'inactive' };
  }
  
  // Check working hours (7 AM to 6 PM)
  if (hour < 7 || hour > 18) {
    return { score: 0.3, reason: 'off-hours' };
  }
  
  // Check if weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { score: 0.5, reason: 'weekend' };
  }
  
  // Check current workload (this would need to be passed in or calculated)
  const currentJobs = employee.currentJobs || 0;
  if (currentJobs >= 3) {
    return { score: 0.2, reason: 'overloaded' };
  } else if (currentJobs >= 2) {
    return { score: 0.6, reason: 'busy' };
  }
  
  return { score: 1.0, reason: 'available' };
};

/**
 * Intelligently assign tasks to employees
 */
export const autoAssignTasks = async (tasks, employees, job) => {
  if (!tasks || tasks.length === 0 || !employees || employees.length === 0) {
    return tasks;
  }
  
  const unassignedTasks = tasks.filter(task => !task.assignedTo);
  if (unassignedTasks.length === 0) {
    return tasks;
  }
  
  // Calculate suitability scores for each employee-task combination
  const assignments = [];
  
  for (const task of unassignedTasks) {
    const taskAssignments = [];
    
    for (const employee of employees) {
      const score = await calculateEmployeeSuitability(employee, task, job);
      taskAssignments.push({
        employeeId: employee.id,
        employeeName: employee.displayName || employee.name || employee.email?.split('@')[0] || 'Employee',
        score,
        task
      });
    }
    
    // Sort by score (highest first)
    taskAssignments.sort((a, b) => b.score - a.score);
    assignments.push(taskAssignments);
  }
  
  // Assign tasks using a balanced approach
  const employeeWorkload = {};
  employees.forEach(emp => {
    employeeWorkload[emp.id] = tasks.filter(t => t.assignedTo === emp.id).length;
  });
  
  const updatedTasks = [...tasks];
  
  assignments.forEach((taskAssignments, taskIndex) => {
    const task = unassignedTasks[taskIndex];
    
    // Find the best available employee considering workload balance
    let bestAssignment = null;
    let bestScore = -1;
    
    for (const assignment of taskAssignments) {
      // Adjust score based on current workload to promote balance
      const workloadPenalty = employeeWorkload[assignment.employeeId] * 5;
      const adjustedScore = assignment.score - workloadPenalty;
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestAssignment = assignment;
      }
    }
    
    if (bestAssignment && bestScore > 30) { // Minimum threshold
      // Update the task
      const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        updatedTasks[taskIndex] = {
          ...task,
          assignedTo: bestAssignment.employeeId,
          assignedToName: bestAssignment.employeeName
        };
        
        // Update workload tracking
        employeeWorkload[bestAssignment.employeeId]++;
      }
    }
  });
  
  return updatedTasks;
};

/**
 * Get task assignment recommendations
 */
export const getTaskAssignmentRecommendations = async (task, employees, job) => {
  const recommendations = [];
  
  for (const employee of employees) {
    const score = await calculateEmployeeSuitability(employee, task, job);
    const availability = getEmployeeAvailability(employee);
    
    recommendations.push({
      employee,
      score,
      availability,
      recommendation: score > 80 ? 'Excellent match' :
                     score > 60 ? 'Good match' :
                     score > 40 ? 'Fair match' : 'Poor match'
    });
  }
  
  return recommendations.sort((a, b) => b.score - a.score);
};

/**
 * Optimize task distribution among assigned employees
 */
export const optimizeTaskDistribution = async (tasks, employees, job) => {
  if (!employees || employees.length === 0) {
    return tasks;
  }
  
  // Group tasks by priority
  const highPriorityTasks = tasks.filter(t => t.priority === 'High');
  const mediumPriorityTasks = tasks.filter(t => t.priority === 'Medium');
  const lowPriorityTasks = tasks.filter(t => t.priority === 'Low');
  
  // Assign high priority tasks first
  let optimizedTasks = await autoAssignTasks(highPriorityTasks, employees, job);
  
  // Then medium priority
  const remainingMedium = mediumPriorityTasks.map(task => {
    const existing = optimizedTasks.find(t => t.id === task.id);
    return existing || task;
  });
  optimizedTasks = [...optimizedTasks, ...await autoAssignTasks(remainingMedium, employees, job)];
  
  // Finally low priority
  const remainingLow = lowPriorityTasks.map(task => {
    const existing = optimizedTasks.find(t => t.id === task.id);
    return existing || task;
  });
  optimizedTasks = [...optimizedTasks, ...await autoAssignTasks(remainingLow, employees, job)];
  
  return optimizedTasks;
};