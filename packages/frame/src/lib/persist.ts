// The key a store's state is remembered under.
//
// The frame is a package both products link, so the key it writes under cannot be either product's name. Two builds that
// share an origin would read each other's arrangement, and a pilot who moves between them would carry one product's
// windows into the other's. The namespace is the package's, and a store adds its own name to it.

/**
 * The storage key for one of the frame's stores.
 *
 * A deployment that wants its own keys is a deployment that installs its own stores, so this stays a constant rather
 * than a host field: the namespace is the frame's and what each store calls itself is the store's.
 */
export function storageName(store: string): string {
  return `skene.${store}`;
}
