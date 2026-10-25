import studio from "./work-studio.json";

export type OfficeTask = { title: string; owner: string; done: boolean };
export type Staff = { id: string; name: string; coat: string; role: string };

export const STAFF: Staff[] = studio.staff;

// The department's tasks are shared round-robin across the staff, in list order.
export function openTasksByStaff(tasks: OfficeTask[]): Record<string, OfficeTask[]> {
  const open: Record<string, OfficeTask[]> = {};
  tasks.forEach((task, index) => { if (!task.done) (open[STAFF[index % STAFF.length].id] ??= []).push(task); });
  return open;
}

export function deskLabel(id: string, department: string) {
  const labels: Record<string, string> = studio.desks.find(desk => desk.staff === id)?.labels ?? {};
  return labels[department] ?? Object.values(labels)[0] ?? "";
}
