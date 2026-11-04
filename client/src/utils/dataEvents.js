export const DATA_CHANGED_EVENT = 'app:data-changed';

export function emitDataChanged(resource) {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { resource } }));
}
