export type VehicleStatus = "OK" | "DUE" | "OVERDUE" | "IN SERVICE";

export interface Vehicle {
  id: string;
  reg: string;
  make: string;
  model: string;
  year: number;
  odometer: number;
  status: VehicleStatus;
  nextServiceDue: string;
  lastService: string;
  technician: string;
  fuelType: string;
  notes: string;
}

export type ServiceStatus = "BOOKED" | "IN SERVICE" | "COMPLETED" | "OVERDUE";

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  vehicleName: string;
  type: string;
  status: ServiceStatus;
  bookedDate: string;
  startDate: string | null;
  completedDate: string | null;
  technician: string;
  odometer: number;
  notes: string;
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  id: string;
  timestamp: string;
  actor: string;
  event: string;
  detail?: string;
}

export interface Alert {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  vehicleName: string;
  type: "OVERDUE" | "DUE" | "FAULT";
  message: string;
  daysOverdue?: number;
  dueDate: string;
  dismissed: boolean;
}

export const VEHICLES: Vehicle[] = [
  { id: "v01", reg: "TS01AB1234", make: "Tata", model: "Ace", year: 2019, odometer: 84212, status: "OVERDUE", nextServiceDue: "2026-09-02", lastService: "2026-03-01", technician: "M. Rajan", fuelType: "Diesel", notes: "Rear brake pads flagged at last service." },
  { id: "v02", reg: "TS02CD5678", make: "Ashok Leyland", model: "Dost", year: 2020, odometer: 102004, status: "OK", nextServiceDue: "2026-12-10", lastService: "2026-06-10", technician: "P. Venkat", fuelType: "Diesel", notes: "" },
  { id: "v03", reg: "TS03EF9012", make: "Mahindra", model: "Bolero Pickup", year: 2021, odometer: 67430, status: "DUE", nextServiceDue: "2026-09-15", lastService: "2026-03-15", technician: "M. Rajan", fuelType: "Diesel", notes: "Tyre rotation requested by driver." },
  { id: "v04", reg: "TS04GH3456", make: "Eicher", model: "Pro 2049", year: 2018, odometer: 148900, status: "IN SERVICE", nextServiceDue: "2026-09-20", lastService: "2026-03-20", technician: "S. Anand", fuelType: "Diesel", notes: "Transmission noise reported." },
  { id: "v05", reg: "TS05IJ7890", make: "Force", model: "Traveller", year: 2022, odometer: 41200, status: "OK", nextServiceDue: "2026-11-01", lastService: "2026-05-01", technician: "P. Venkat", fuelType: "CNG", notes: "" },
  { id: "v06", reg: "TS06KL2345", make: "Tata", model: "407", year: 2017, odometer: 198340, status: "OVERDUE", nextServiceDue: "2026-08-20", lastService: "2026-02-20", technician: "S. Anand", fuelType: "Diesel", notes: "Engine oil change critical." },
  { id: "v07", reg: "TS07MN6789", make: "Mahindra", model: "Supro", year: 2023, odometer: 22100, status: "OK", nextServiceDue: "2027-01-05", lastService: "2026-07-05", technician: "M. Rajan", fuelType: "Petrol", notes: "" },
  { id: "v08", reg: "TS08OP0123", make: "Piaggio", model: "Ape City", year: 2021, odometer: 54670, status: "DUE", nextServiceDue: "2026-09-10", lastService: "2026-03-10", technician: "P. Venkat", fuelType: "CNG", notes: "" },
  { id: "v09", reg: "TS09QR4567", make: "Ashok Leyland", model: "Partner", year: 2019, odometer: 119800, status: "OK", nextServiceDue: "2026-10-30", lastService: "2026-04-30", technician: "S. Anand", fuelType: "Diesel", notes: "" },
  { id: "v10", reg: "TS10ST8901", make: "Tata", model: "Winger", year: 2020, odometer: 88550, status: "OK", nextServiceDue: "2026-11-15", lastService: "2026-05-15", technician: "M. Rajan", fuelType: "Diesel", notes: "" },
  { id: "v11", reg: "TS11UV2346", make: "SML Isuzu", model: "Samrat", year: 2018, odometer: 175300, status: "DUE", nextServiceDue: "2026-09-08", lastService: "2026-03-08", technician: "P. Venkat", fuelType: "Diesel", notes: "Clutch pedal feel reported soft." },
  { id: "v12", reg: "TS12WX6790", make: "Mahindra", model: "Imperio", year: 2022, odometer: 33400, status: "OK", nextServiceDue: "2026-12-01", lastService: "2026-06-01", technician: "S. Anand", fuelType: "Diesel", notes: "" },
];

export const SERVICE_RECORDS: ServiceRecord[] = [
  {
    id: "sr001",
    vehicleId: "v01",
    vehicleReg: "TS01AB1234",
    vehicleName: "Tata Ace",
    type: "Scheduled — 6-month service",
    status: "OVERDUE",
    bookedDate: "2026-08-25",
    startDate: null,
    completedDate: null,
    technician: "M. Rajan",
    odometer: 84212,
    notes: "Rear brake pads to be inspected. Oil change due.",
    timeline: [
      { id: "t1", timestamp: "2026-08-25 09:14", actor: "M. Sharma", event: "Service booked", detail: "Scheduled 6-month service for TS01AB1234" },
      { id: "t2", timestamp: "2026-09-01 08:00", actor: "System", event: "Due date reached", detail: "Vehicle not yet checked in" },
      { id: "t3", timestamp: "2026-09-02 11:30", actor: "System", event: "Marked overdue", detail: "3 days past due date" },
    ]
  },
  {
    id: "sr002",
    vehicleId: "v04",
    vehicleReg: "TS04GH3456",
    vehicleName: "Eicher Pro 2049",
    type: "Unscheduled — Transmission inspection",
    status: "IN SERVICE",
    bookedDate: "2026-09-01",
    startDate: "2026-09-03",
    completedDate: null,
    technician: "S. Anand",
    odometer: 148900,
    notes: "Driver reports grinding noise when shifting into 3rd gear.",
    timeline: [
      { id: "t1", timestamp: "2026-09-01 14:22", actor: "M. Sharma", event: "Service booked", detail: "Unscheduled inspection — transmission noise complaint" },
      { id: "t2", timestamp: "2026-09-03 07:45", actor: "S. Anand", event: "Service started", detail: "Vehicle checked in. Initial inspection begun." },
      { id: "t3", timestamp: "2026-09-03 10:15", actor: "S. Anand", event: "Note added", detail: "Synchromesh on 3rd gear worn. Ordering replacement part — ETA 2 days." },
    ]
  },
  {
    id: "sr003",
    vehicleId: "v02",
    vehicleReg: "TS02CD5678",
    vehicleName: "Ashok Leyland Dost",
    type: "Scheduled — 6-month service",
    status: "COMPLETED",
    bookedDate: "2026-06-08",
    startDate: "2026-06-10",
    completedDate: "2026-06-10",
    technician: "P. Venkat",
    odometer: 99100,
    notes: "Full service completed. All checks passed.",
    timeline: [
      { id: "t1", timestamp: "2026-06-08 11:00", actor: "M. Sharma", event: "Service booked", detail: "Routine 6-month service" },
      { id: "t2", timestamp: "2026-06-10 08:30", actor: "P. Venkat", event: "Service started", detail: "Vehicle checked in" },
      { id: "t3", timestamp: "2026-06-10 14:45", actor: "P. Venkat", event: "Service completed", detail: "Oil changed, filters replaced, brake inspection — all OK. Tyre pressure normalised." },
      { id: "t4", timestamp: "2026-06-10 15:00", actor: "M. Sharma", event: "Record closed", detail: "Service record marked complete" },
    ]
  },
  {
    id: "sr004",
    vehicleId: "v06",
    vehicleReg: "TS06KL2345",
    vehicleName: "Tata 407",
    type: "Scheduled — 6-month service",
    status: "OVERDUE",
    bookedDate: "2026-08-15",
    startDate: null,
    completedDate: null,
    technician: "S. Anand",
    odometer: 198340,
    notes: "Engine oil critical. Vehicle should not continue operating.",
    timeline: [
      { id: "t1", timestamp: "2026-08-15 10:00", actor: "M. Sharma", event: "Service booked", detail: "Overdue service booked for TS06KL2345" },
      { id: "t2", timestamp: "2026-08-20 08:00", actor: "System", event: "Marked overdue", detail: "Vehicle has not been checked in" },
    ]
  },
  {
    id: "sr005",
    vehicleId: "v03",
    vehicleReg: "TS03EF9012",
    vehicleName: "Mahindra Bolero Pickup",
    type: "Scheduled — 6-month service",
    status: "BOOKED",
    bookedDate: "2026-09-04",
    startDate: null,
    completedDate: null,
    technician: "M. Rajan",
    odometer: 67430,
    notes: "Tyre rotation requested by driver.",
    timeline: [
      { id: "t1", timestamp: "2026-09-04 09:00", actor: "M. Sharma", event: "Service booked", detail: "Routine 6-month service with tyre rotation" },
    ]
  },
];

export const ALERTS: Alert[] = [
  { id: "a01", vehicleId: "v01", vehicleReg: "TS01AB1234", vehicleName: "Tata Ace", type: "OVERDUE", message: "3 days overdue — last due Sept 2", daysOverdue: 3, dueDate: "2026-09-02", dismissed: false },
  { id: "a02", vehicleId: "v06", vehicleReg: "TS06KL2345", vehicleName: "Tata 407", type: "OVERDUE", message: "16 days overdue — last due Aug 20", daysOverdue: 16, dueDate: "2026-08-20", dismissed: false },
  { id: "a03", vehicleId: "v03", vehicleReg: "TS03EF9012", vehicleName: "Mahindra Bolero Pickup", type: "DUE", message: "Due Sept 15 — service booked", dueDate: "2026-09-15", dismissed: false },
  { id: "a04", vehicleId: "v08", vehicleReg: "TS08OP0123", vehicleName: "Piaggio Ape City", type: "DUE", message: "Due Sept 10 — not yet booked", dueDate: "2026-09-10", dismissed: false },
  { id: "a05", vehicleId: "v11", vehicleReg: "TS11UV2346", vehicleName: "SML Isuzu Samrat", type: "DUE", message: "Due Sept 8 — not yet booked", dueDate: "2026-09-08", dismissed: false },
];

export const WEEKLY_STATS = [
  { week: "Jul 21", completed: 4, overdue: 0 },
  { week: "Jul 28", completed: 6, overdue: 1 },
  { week: "Aug 4", completed: 3, overdue: 0 },
  { week: "Aug 11", completed: 7, overdue: 2 },
  { week: "Aug 18", completed: 5, overdue: 1 },
  { week: "Aug 25", completed: 4, overdue: 0 },
  { week: "Sep 1", completed: 2, overdue: 2 },
  { week: "Sep 5", completed: 1, overdue: 0 },
];

export const TECHNICIANS = ["All technicians", "M. Rajan", "P. Venkat", "S. Anand"];
