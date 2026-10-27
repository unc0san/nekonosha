import studio from "./work-studio.json";

// `staff` pins a task to one cat (a request handed out by ぽんず); `request` marks it as one, so the office can show it.
export type OfficeTask = { title: string; owner: string; done: boolean; staff?: string; request?: boolean };
export type Staff = { id: string; name: string; coat: string; role: string };

export const STAFF: Staff[] = studio.staff;

// Pinned tasks go to their cat, ahead of its share; the rest of the department's tasks are shared round-robin, in list order.
export function openTasksByStaff(tasks: OfficeTask[]): Record<string, OfficeTask[]> {
  const open: Record<string, OfficeTask[]> = {};
  tasks.filter(task => !task.staff).forEach((task, index) => { if (!task.done) (open[STAFF[index % STAFF.length].id] ??= []).push(task); });
  [...tasks].reverse().forEach(task => { if (task.staff && !task.done) (open[task.staff] ??= []).unshift(task); });
  return open;
}

// Cats with an open request stay at their desks until they hand it in (no meetings or coffee breaks).
export const onRequest = (tasks: OfficeTask[]) => new Set(tasks.filter(task => task.request && task.staff && !task.done).map(task => task.staff as string));

export function deskLabel(id: string, department: string) {
  const labels: Record<string, string> = studio.desks.find(desk => desk.staff === id)?.labels ?? {};
  return labels[department] ?? Object.values(labels)[0] ?? "";
}
