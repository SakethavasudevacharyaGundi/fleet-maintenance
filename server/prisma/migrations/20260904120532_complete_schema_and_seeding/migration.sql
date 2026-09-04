/*
  Warnings:

  - You are about to drop the `AlertDismissal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vehicle` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AlertDismissal" DROP CONSTRAINT "AlertDismissal_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceAssignment" DROP CONSTRAINT "ServiceAssignment_serviceRecordId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceAssignment" DROP CONSTRAINT "ServiceAssignment_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceEvent" DROP CONSTRAINT "ServiceEvent_actorId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceEvent" DROP CONSTRAINT "ServiceEvent_serviceRecordId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRecord" DROP CONSTRAINT "ServiceRecord_vehicleId_fkey";

-- DropTable
DROP TABLE "AlertDismissal";

-- DropTable
DROP TABLE "ServiceAssignment";

-- DropTable
DROP TABLE "ServiceEvent";

-- DropTable
DROP TABLE "ServiceRecord";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Vehicle";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "odometer" INTEGER NOT NULL,
    "date_interval_days" INTEGER NOT NULL,
    "mileage_interval" INTEGER NOT NULL,
    "last_completed_date" TIMESTAMP(3),
    "last_completed_odometer" INTEGER,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_records" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL,
    "became_due_at" TIMESTAMP(3) NOT NULL,
    "scheduled_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_assignments" (
    "service_record_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,

    CONSTRAINT "service_assignments_pkey" PRIMARY KEY ("service_record_id","technician_id")
);

-- CreateTable
CREATE TABLE "service_events" (
    "id" TEXT NOT NULL,
    "service_record_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_dismissals" (
    "vehicle_id" TEXT NOT NULL,
    "due_cycle_start" TIMESTAMP(3) NOT NULL,
    "dismissed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_dismissals_pkey" PRIMARY KEY ("vehicle_id","due_cycle_start")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_key" ON "vehicles"("registration");

-- CreateIndex
CREATE INDEX "service_records_vehicle_id_idx" ON "service_records"("vehicle_id");

-- CreateIndex
CREATE INDEX "service_records_status_idx" ON "service_records"("status");

-- CreateIndex
CREATE INDEX "service_records_scheduled_date_idx" ON "service_records"("scheduled_date");

-- CreateIndex
CREATE INDEX "service_records_updated_at_idx" ON "service_records"("updated_at");

-- CreateIndex
CREATE INDEX "service_assignments_technician_id_idx" ON "service_assignments"("technician_id");

-- CreateIndex
CREATE INDEX "service_events_service_record_id_idx" ON "service_events"("service_record_id");

-- CreateIndex
CREATE INDEX "service_events_created_at_idx" ON "service_events"("created_at");

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_assignments" ADD CONSTRAINT "service_assignments_service_record_id_fkey" FOREIGN KEY ("service_record_id") REFERENCES "service_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_assignments" ADD CONSTRAINT "service_assignments_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_service_record_id_fkey" FOREIGN KEY ("service_record_id") REFERENCES "service_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_dismissals" ADD CONSTRAINT "alert_dismissals_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
