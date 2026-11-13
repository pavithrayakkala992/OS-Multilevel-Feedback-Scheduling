
#include <iostream>
#include <vector>
#include <deque>
#include <algorithm>
#include <random>
#include <iomanip>
#include <string>
using namespace std;

// Process Control Block
struct Process {
    int pid;
    int arrivalTime;
    int burstTime;
    int remainingTime;
    int completionTime = -1;
    int waitingTime = 0;
    int turnaroundTime = 0;
    int currentQueue = 0;
    int quantumUsed = 0;
};

// Gantt Chart Entry
struct GanttEntry {
    int pid;
    int start;
    int end;
    int queue;
};

class MLFQScheduler {

private:
    vector<Process> processes;
    deque<int> queues[3];

    // Time quantum: 3 units for Queue 1 and Queue 2
    // Queue 3 uses FCFS
    const int quantum[3] = {3, 3, 0};

    vector<GanttEntry> gantt;

    int currentTime = 0;
    int completed = 0;
    int simulationDuration;

    // Add newly arrived processes
    void addArrivals() {
        for (int i = 0; i < (int)processes.size(); i++) {
            if (processes[i].arrivalTime == currentTime) {
                processes[i].currentQueue = 0;
                queues[0].push_back(i);
            }
        }
    }

    // Find highest priority queue
    int getHighestPriorityQueue() {
        for (int i = 0; i < 3; i++) {
            if (!queues[i].empty())
                return i;
        }
        return -1;
    }

    // Record CPU execution
    void recordExecution(int index, int level) {
        int pid = processes[index].pid;

        if (!gantt.empty() &&
            gantt.back().pid == pid &&
            gantt.back().queue == level &&
            gantt.back().end == currentTime) {
            gantt.back().end++;
        }
        else {
            gantt.push_back({
                pid, currentTime, currentTime + 1, level
            });
        }
    }

    // Record idle time
    void recordIdle() {
        if (!gantt.empty() &&
            gantt.back().pid == -1 &&
            gantt.back().end == currentTime) {
            gantt.back().end++;
        }
        else {
            gantt.push_back({
                -1, currentTime, currentTime + 1, -1
            });
        }
    }

public:

    MLFQScheduler(vector<Process> p, int duration) {
        processes = p;
        simulationDuration = duration;
    }

    // Scheduling algorithm
    void run() {

        int running = -1;

        cout << "\n========================================\n";
        cout << " MULTILEVEL FEEDBACK QUEUE SCHEDULING\n";
        cout << "========================================\n";

        cout << "\nQUEUE CONFIGURATION\n";
        cout << "Queue 1: High Priority - RR (3 units)\n";
        cout << "Queue 2: Medium Priority - RR (3 units)\n";
        cout << "Queue 3: Low Priority - FCFS\n";

        cout << "\nSimulation Duration: "
             << simulationDuration << " units\n";

        while (currentTime < simulationDuration) {

            // Add newly arrived processes
            addArrivals();

            // Higher-priority preemption
            if (running != -1) {

                int highest = getHighestPriorityQueue();

                if (highest != -1 &&
                    highest < processes[running].currentQueue) {

                    // Preserve the process and its used quantum
                    queues[processes[running].currentQueue]
                        .push_front(running);

                    running = -1;
                }
            }

            // Select next process
            if (running == -1) {

                int highest = getHighestPriorityQueue();

                if (highest != -1) {
                    running = queues[highest].front();
                    queues[highest].pop_front();
                }
            }

            // CPU idle
            if (running == -1) {
                recordIdle();
                currentTime++;
                continue;
            }

            Process &p = processes[running];

            int level = p.currentQueue;

            // Execute one unit
            recordExecution(running, level);

            p.remainingTime--;
            p.quantumUsed++;

            currentTime++;

            // Process completed
            if (p.remainingTime == 0) {

                p.completionTime = currentTime;

                p.turnaroundTime =
                    p.completionTime - p.arrivalTime;

                p.waitingTime =
                    p.turnaroundTime - p.burstTime;

                completed++;
                running = -1;
            }

            // Time quantum expired
            else if (level < 2 &&
                     p.quantumUsed >= quantum[level]) {

                p.currentQueue++;
                p.quantumUsed = 0;

                queues[p.currentQueue].push_back(running);

                running = -1;
            }
        }

        displayResults();
    }

    // Display results
    void displayResults() {

        cout << "\n========================================\n";
        cout << "               GANTT CHART\n";
        cout << "========================================\n";

        for (const auto &g : gantt) {
            if (g.pid == -1)
                cout << "| IDLE ";
            else
                cout << "| P" << g.pid
                     << "(Q" << g.queue + 1 << ") ";
        }

        cout << "|\n";

        for (const auto &g : gantt) {
            cout << left << setw(8) << g.start;
        }

        cout << currentTime << "\n";

        // Individual results
        cout << "\n========================================\n";
        cout << "             PROCESS RESULTS\n";
        cout << "========================================\n";

        cout << left
             << setw(8) << "PID"
             << setw(10) << "Arrival"
             << setw(8) << "Burst"
             << setw(12) << "Completion"
             << setw(10) << "Waiting"
             << setw(12) << "Turnaround"
             << "Status\n";

        double totalWaiting = 0;
        double totalTurnaround = 0;

        for (const auto &p : processes) {

            cout << left
                 << setw(8) << ("P" + to_string(p.pid))
                 << setw(10) << p.arrivalTime
                 << setw(8) << p.burstTime;

            if (p.completionTime != -1) {

                cout << setw(12) << p.completionTime
                     << setw(10) << p.waitingTime
                     << setw(12) << p.turnaroundTime
                     << "Completed\n";

                totalWaiting += p.waitingTime;
                totalTurnaround += p.turnaroundTime;
            }
            else {
                cout << setw(12) << "-"
                     << setw(10) << "-"
                     << setw(12) << "-"
                     << "Not completed (Remaining: "
                     << p.remainingTime << ")\n";
            }
        }

        // Average calculations
        cout << "\n========================================\n";
        cout << "           PERFORMANCE RESULTS\n";
        cout << "========================================\n";

        cout << "Total Processes: "
             << processes.size() << endl;

        cout << "Completed Processes: "
             << completed << endl;

        cout << "Uncompleted Processes: "
             << processes.size() - completed << endl;

        if (completed > 0) {

            cout << fixed << setprecision(2);

            cout << "Average Waiting Time: "
                 << totalWaiting / completed << endl;

            cout << "Average Turnaround Time: "
                 << totalTurnaround / completed << endl;
        }
        else {
            cout << "No processes completed.\n";
        }

        cout << "\nSimulation Ended at Time: "
             << currentTime << endl;
    }
};

// Main Function
int main() {

    int choice, duration;

    cout << "\n========================================\n";
    cout << "        CPU SCHEDULING SIMULATOR\n";
    cout << "========================================\n";

    cout << "\n1. Fixed Burst Times\n";
    cout << "2. Randomized Burst Times\n";
    cout << "3. Higher Priority Preemption Test\n";

    cout << "\nEnter your choice: ";
    cin >> choice;

    if (choice < 1 || choice > 3) {
        cout << "Invalid choice!\n";
        return 0;
    }

    cout << "Enter simulation duration: ";
    cin >> duration;

    if (duration <= 0) {
        cout << "Invalid simulation duration!\n";
        return 0;
    }

    vector<Process> processes;

    // Fixed burst times
    if (choice == 1) {

        processes = {
            {1, 0, 7, 7},
            {2, 1, 5, 5},
            {3, 2, 4, 4},
            {4, 3, 6, 6}
        };

        cout << "\nFixed process data selected.\n";
    }

    // Randomized burst times
    else if (choice == 2) {

        int n;

        cout << "Enter number of processes: ";
        cin >> n;

        if (n <= 0) {
            cout << "Invalid number of processes!\n";
            return 0;
        }

        random_device rd;
        mt19937 gen(rd());

        uniform_int_distribution<> arrivalDist(
            0, min(10, duration - 1)
        );

        uniform_int_distribution<> burstDist(1, 15);

        for (int i = 0; i < n; i++) {

            int arrival = arrivalDist(gen);
            int burst = burstDist(gen);

            processes.push_back({
                i + 1, arrival, burst, burst
            });
        }

        sort(processes.begin(), processes.end(),
             [](const Process &a, const Process &b) {
                 return a.arrivalTime < b.arrivalTime;
             });

        cout << "\nRandom processes generated successfully.\n";
    }

    // Preemption test
    else {

        processes = {
            {1, 0, 20, 20},
            {2, 5, 2, 2},
            {3, 6, 4, 4}
        };

        cout << "\nPreemption test selected.\n";
    }

    // Display process details
    cout << "\nPROCESS INPUT DETAILS\n";
    cout << "-----------------------------------\n";
    cout << "PID\tArrival Time\tBurst Time\n";

    for (const auto &p : processes) {
        cout << "P" << p.pid << "\t"
             << p.arrivalTime << "\t\t"
             << p.burstTime << endl;
    }

    // Run scheduler
    MLFQScheduler scheduler(processes, duration);
    scheduler.run();

    return 0;
}
