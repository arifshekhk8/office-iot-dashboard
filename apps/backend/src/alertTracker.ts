import type { Alert } from '@office/shared';

/**
 * Tracks which alerts are currently active and reports edge transitions.
 * The rules themselves live in @office/shared (`evaluateAlerts`) — this class
 * only diffs successive evaluations so Socket.IO clients (dashboard, bot) get
 * exactly one `alert:new` per alert appearance and one `alert:cleared` when
 * it resolves.
 */
export class AlertTracker {
  private active = new Map<string, Alert>();

  update(current: Alert[]): { added: Alert[]; cleared: Alert[] } {
    const added: Alert[] = [];
    const cleared: Alert[] = [];
    const currentIds = new Set(current.map((a) => a.id));

    for (const alert of current) {
      const existing = this.active.get(alert.id);
      if (!existing) {
        this.active.set(alert.id, alert);
        added.push(alert);
      } else {
        // keep the original `since`; refresh the message in case state moved
        this.active.set(alert.id, { ...alert, since: existing.since });
      }
    }
    for (const [id, alert] of this.active) {
      if (!currentIds.has(id)) {
        this.active.delete(id);
        cleared.push(alert);
      }
    }
    return { added, cleared };
  }

  list(): Alert[] {
    return [...this.active.values()].sort((a, b) => b.since.localeCompare(a.since));
  }
}
