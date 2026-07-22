/**
 * Links to a courier's public tracking page.
 *
 * Some couriers accept the consignment number as a query parameter and land the
 * customer straight on the result; India Post's does not, so we send them to the
 * official home page (which hosts the "Track & Trace" box) and tell them exactly
 * which field to paste into. Either way the link goes to the courier's own site
 * — never a third-party aggregator — so the customer tracks against the source
 * of truth.
 */

export interface CourierTracking {
  /** URL to open. */
  url: string
  /** True when the URL pre-fills the number; false when they must paste it. */
  prefilled: boolean
  /** Extra guidance shown under the button when the number isn't pre-filled. */
  note?: string
}

export function courierTracking(courier: string | null | undefined, trackingNumber: string): CourierTracking {
  const key = (courier ?? '').trim().toLowerCase()
  const n = encodeURIComponent(trackingNumber.trim())

  switch (key) {
    case 'delhivery':
      return { url: `https://www.delhivery.com/track/package/${n}`, prefilled: true }
    case 'blue dart':
    case 'bluedart':
      return {
        url: `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${n}`,
        prefilled: true,
      }
    case 'dtdc':
      return { url: 'https://www.dtdc.in/tracking.asp', prefilled: false }
    case 'india post':
    case 'indiapost':
    default:
      // India Post has no shareable tracking URL — its "Track & Trace" box is a
      // stateful form on the home page. We point there and tell the customer to
      // pick the "Article number" option (that's what our tracking number is).
      return {
        url: 'https://www.indiapost.gov.in/',
        prefilled: false,
        note: 'On the India Post site, use the "Track & Trace" box, choose "Article number", and paste the number above.',
      }
  }
}
