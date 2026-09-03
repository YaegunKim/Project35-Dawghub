import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import {
  icon as renderFaIcon,
  library,
  findIconDefinition,
  type IconDefinition,
} from '@fortawesome/fontawesome-svg-core'
import {
  faArrowsUpDown,
  faBookOpenReader,
  faBus,
  faChevronRight,
  faDumbbell,
  faEye,
  faEyeSlash,
  faGear,
  faHouse,
  faLayerGroup,
  faLocationCrosshairs,
  faMagnifyingGlass,
  faMapPin,
  faPersonWalking,
  faPlay,
  faRoute,
  faUtensils,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '../../design-system/Button/Button'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { Input } from '../../design-system/Input/Input'
import { Modal } from '../../design-system/Modal/Modal'
import { useFavorites } from '../../lib/useFavorites'
import {
  MAP_DINING_FAVORITES_KEY,
  MAP_GYM_FAVORITES_KEY,
  MAP_LIBRARY_FAVORITES_KEY,
  useBusLayerPrefs,
} from '../../lib/mapLayerPrefs'
import { fetchUgaBuses, fetchUgaRoutesAndStops, type PassioRoute } from '../../lib/passio'
import { haversineDistanceMeters } from '../../lib/geo'
import {
  planTrip,
  type DirectionsPoint,
  type LatLng,
  type TripLeg,
  type TripOption,
  type TripPlan,
} from '../../lib/directions'
import {
  DINING_BUILDING_NAMES,
  GYM_BUILDING_NAMES,
  LIBRARY_BUILDING_NAMES,
  fetchUgaBuildings,
  findBuildingByName,
  type UgaBuilding,
} from '../../lib/ugaBuildings'
import { fetchLibraryHoursToday } from '../../lib/libraryHours'
import { getGymHoursTodayByBuildingName } from '../../lib/gymHours'
import { getDiningHallByBuildingName } from '../../lib/diningHours'
import type { MapLocationState } from '../../lib/mapNavigation'
import { UGA_CAMPUS_BOUNDARY } from '../../lib/campusBoundary'
import { fetchMapPreference, updateMapPreference } from '../../lib/mapPreferences'
import { client } from '../../lib/amplifyClient'
import { queryClient } from '../../lib/queryClient'
import { CLASS_ENTRIES_KEY } from '../../lib/queryKeys'
import i18n from '../../i18n'
import { bindReactPopup } from './reactPopup'
import { MapInfoPopup } from './popups/MapInfoPopup'
import { MapDiningPopup } from './popups/MapDiningPopup'
import { MapDormPopup } from './popups/MapDormPopup'
import { MapAcademicPopup, type MapAcademicClass } from './popups/MapAcademicPopup'
import { brand, category } from '../../design-system/colors'
import { S } from './MapPage.style'

library.add(faBookOpenReader, faDumbbell, faUtensils)

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const UGA_CENTER: [number, number] = [33.948, -83.3773]
const BASE_ZOOM = 15
// Close enough to read a single building clearly without the tiles pixelating (tile maxZoom is 20).
const FOCUS_ZOOM = 18
const FOCUS_FLY_DURATION_S = 1.2
// A little over two ripple cycles (see .dawghub-ripple in GlobalStyles.tsx) so the marker is
// removed on a clean fade-out beat rather than mid-pulse.
const RIPPLE_DURATION_MS = 2900
const MIN_ICON_SCALE = 0.6
const MAX_ICON_SCALE = 1.6
const BUS_POLL_INTERVAL_MS = 8000
const BUS_ANIMATION_MS = 6000

function iconScaleForZoom(zoom: number) {
  const scale = 2 ** (zoom - BASE_ZOOM)
  return Math.min(MAX_ICON_SCALE, Math.max(MIN_ICON_SCALE, scale))
}

type LayerKey = 'bus' | 'library' | 'dining' | 'gym' | 'housing' | 'academics'

const HOUSING_DOT_COLOR = category.housing
const ACADEMICS_DOT_COLOR = category.academics
const BUILDING_DOT_RADIUS = 2
const MY_DORM_COLOR = category.myDorm.fill
const MY_ACADEMIC_COLOR = category.myAcademic.fill
const MY_ACADEMIC_BORDER = category.myAcademic.border

const BOOK_OPEN_READER_ICON = findIconDefinition({ prefix: 'fas', iconName: 'book-open-reader' })
const DUMBBELL_ICON_DEF = findIconDefinition({ prefix: 'fas', iconName: 'dumbbell' })
const UTENSILS_ICON_DEF = findIconDefinition({ prefix: 'fas', iconName: 'utensils' })

// Bare icon in its category color — no background chip. A drop-shadow (not a shape) keeps
// it legible over busy map tiles without adding back the circle.
function themedIcon(definition: IconDefinition, color: string) {
  const svgHtml = renderFaIcon(definition, {
    styles: { color, width: '16px', height: '16px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' },
  }).html[0]
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;">${svgHtml}</div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function dotMarkerIcon(background: string) {
  return L.divIcon({
    html: `<div style="width:8px;height:8px;border-radius:50%;background:${background};box-shadow:0 0 0 2px rgba(255,255,255,0.85);"></div>`,
    className: '',
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  })
}

const LIBRARY_ICON = themedIcon(BOOK_OPEN_READER_ICON, category.library)
const LIBRARY_DOT = dotMarkerIcon(category.library)
const DINING_ICON = themedIcon(UTENSILS_ICON_DEF, category.dining)
const DINING_DOT = dotMarkerIcon(category.dining)
const GYM_ICON = themedIcon(DUMBBELL_ICON_DEF, category.gym)
const GYM_DOT = dotMarkerIcon(category.gym)
const HOUSE_ICON = themedIcon(faHouse, MY_DORM_COLOR)

function userLocationIcon(heading: number | null) {
  const cone =
    heading !== null
      ? `<div style="position:absolute;inset:0;transform:rotate(${heading}deg);">
          <svg width="36" height="36" viewBox="0 0 36 36">
            <path d="M18 18 L9 3 A 10 10 0 0 1 27 3 Z" fill="${category.userLocation}59" />
          </svg>
        </div>`
      : ''
  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:36px;">
      ${cone}
      <div style="position:absolute;top:11px;left:11px;width:14px;height:14px;border-radius:50%;background:${category.userLocation};border:2.5px solid ${brand.white};box-shadow:0 0 0 1px rgba(0,0,0,0.25);"></div>
    </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

// fa-bus (not fa-bus-side) is front-on and symmetric, so it never needs flipping — direction
// of travel is shown separately as a small arrow that swings around the badge's rim.
function busHeadingIcon(color: string, course: number) {
  const heading = Number.isFinite(course) ? course : 0
  const busSvgHtml = renderFaIcon(faBus, {
    styles: { color: brand.white, width: '11px', height: '11px' },
  }).html[0]
  return L.divIcon({
    html: `<div style="position:relative;width:32px;height:32px;">
      <div style="position:absolute;inset:0;transform:rotate(${heading}deg);">
        <svg width="10" height="8" viewBox="0 0 10 8" style="position:absolute;top:0;left:50%;transform:translateX(-50%);filter:drop-shadow(0 1px 1px rgba(0,0,0,0.35));">
          <path d="M5 0 L10 8 L0 8 Z" fill="${color}" stroke="${brand.white}" stroke-width="1" stroke-linejoin="round" />
        </svg>
      </div>
      <div style="position:absolute;top:6px;left:6px;width:20px;height:20px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px ${brand.white},0 1px 3px rgba(0,0,0,0.35);">
        ${busSvgHtml}
      </div>
    </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

// A plain colored circle with the route's own letter/code, dropped at the midpoint of a
// trip's bus leg — the leg's polyline color alone doesn't tell riders which route it is
// (they'd have to already know every route's color by heart), so this reuses the same
// code badge language as the bus layer's own S.BusRouteBadge.
function routeCodeMarkerIcon(color: string, code: string) {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${color};box-shadow:0 0 0 2px ${brand.white},0 1px 3px rgba(0,0,0,0.4);">
      <span style="color:${brand.white};font-size:10px;font-weight:700;text-shadow:0 1px 1px rgba(0,0,0,0.35);">${code}</span>
    </div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function directionsPinIcon(color: string, letter: string) {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};box-shadow:0 0 0 2px ${brand.white},0 1px 3px rgba(0,0,0,0.4);">
      <span style="transform:rotate(45deg);color:${brand.white};font-size:10px;font-weight:700;">${letter}</span>
    </div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  })
}

// Two staggered pulses (.dawghub-ripple in GlobalStyles.tsx) drawing attention to wherever
// "See Location" just flew the map to — the div itself is a zero-size anchor, so the icon's
// on-screen footprint is purely the animated spans inside it.
const RIPPLE_ICON = L.divIcon({
  html: '<div class="dawghub-ripple"><span></span><span></span></div>',
  className: '',
  iconSize: [1, 1],
  iconAnchor: [0, 0],
})

// How close (in meters) GPS has to get to a leg's endpoint before live navigation advances to
// the next leg. Buses stop at a defined point but people don't board/alight from the exact
// GPS coordinate of the stop, and GPS accuracy itself is coarser outdoors on foot too — a
// tight threshold would leave navigation stuck a leg behind where the rider actually is.
const WALK_LEG_ADVANCE_THRESHOLD_METERS = 20
const BUS_LEG_ADVANCE_THRESHOLD_METERS = 40
const NAVIGATION_ZOOM = 18

function legEndPoint(leg: TripLeg): LatLng | null {
  if (leg.kind === 'bus') return { lat: leg.toStop.latitude, lng: leg.toStop.longitude }
  const last = leg.route.coordinates[leg.route.coordinates.length - 1]
  return last ?? null
}

function legTotals(leg: TripLeg): { distanceMeters: number; durationSeconds: number } {
  return leg.kind === 'walk'
    ? { distanceMeters: leg.route.distanceMeters, durationSeconds: leg.route.durationSeconds }
    : { distanceMeters: leg.distanceMeters, durationSeconds: leg.durationSeconds + leg.waitSeconds }
}

function animateMarkerTo(
  marker: L.Marker,
  target: L.LatLng,
  durationMs: number,
  isCancelled: () => boolean,
) {
  const start = marker.getLatLng()
  const startTime = performance.now()

  function step(now: number) {
    if (isCancelled()) return
    const t = Math.min((now - startTime) / durationMs, 1)
    const eased = 1 - (1 - t) * (1 - t)
    marker.setLatLng([
      start.lat + (target.lat - start.lat) * eased,
      start.lng + (target.lng - start.lng) * eased,
    ])
    if (t < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

// An empty `selected` list means "show everything" (see MapPage.md). So unchecking one
// item out of that implicit "all" state has to first expand it into an explicit list of
// everyone else, not just toggle membership in an empty array (which would flip the
// meaning to "show only this one item").
function toggleInEffectiveList(name: string, allNames: string[], selected: string[]): string[] {
  const effective = selected.length > 0 ? selected : allNames
  return effective.includes(name) ? effective.filter((item) => item !== name) : [...effective, name]
}

type LayerChecklistModalProps = {
  title: string
  active: boolean
  onToggleActive: () => void
  names: string[]
  selected: string[]
  onToggleName: (name: string) => void
  onClose: () => void
  emptyMessage: string
  showLabel: string
}

function LayerChecklistModal({
  title,
  active,
  onToggleActive,
  names,
  selected,
  onToggleName,
  onClose,
  emptyMessage,
  showLabel,
}: LayerChecklistModalProps) {
  return (
    <Modal onClose={onClose}>
      <S.ModalHeader>
        <S.ModalTitle>{title}</S.ModalTitle>
        <IconButton aria-label={title} onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} />
        </IconButton>
      </S.ModalHeader>
      <S.ModalBody>
        <S.MasterToggleRow>
          <S.MasterToggleLabel>{showLabel}</S.MasterToggleLabel>
          <S.Switch type="button" $checked={active} aria-pressed={active} onClick={onToggleActive} />
        </S.MasterToggleRow>
        <S.ModalSection>
          {names.length === 0 ? (
            <S.ChecklistEmpty>{emptyMessage}</S.ChecklistEmpty>
          ) : (
            <S.ChecklistGroup>
              {names.map((name) => (
                <S.ChecklistRow key={name}>
                  <input
                    type="checkbox"
                    checked={selected.length === 0 || selected.includes(name)}
                    onChange={() => onToggleName(name)}
                  />
                  {name}
                </S.ChecklistRow>
              ))}
            </S.ChecklistGroup>
          )}
        </S.ModalSection>
      </S.ModalBody>
    </Modal>
  )
}

export function MapPage() {
  const { t } = useTranslation()
  const navRouteLocation = useLocation()
  const navRouteNavigate = useNavigate()
  // Captured once at mount — the Dining tab's "See Location"/"Get Directions" buttons navigate
  // here with this in router state (see mapNavigation.ts). A ref (not state) because it's only
  // ever read once, inside the mount-only map effect below.
  const pendingMapIntentRef = useRef((navRouteLocation.state as MapLocationState | null)?.mapIntent ?? null)
  // Same one-shot-at-mount pattern as pendingMapIntentRef, for the "pick a point and
  // return it" flow (see mapNavigation.ts) — e.g. Schedule's "set location" button.
  const pendingPickIntentRef = useRef((navRouteLocation.state as MapLocationState | null)?.pickIntent ?? null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<Record<LayerKey, L.LayerGroup> | null>(null)
  // Read at fitBounds time so a drawn trip isn't centered under the docked top bar/bottom
  // sheet — both refs are stable across renders, so the mount-only map effect can close over
  // them and still see each one's current rendered height.
  const topBarRef = useRef<HTMLDivElement>(null)
  const bottomSheetRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    bus: true,
    library: true,
    dining: true,
    gym: true,
    housing: true,
    academics: true,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<LayerKey | null>(null)

  const libraryPrefs = useFavorites(MAP_LIBRARY_FAVORITES_KEY)
  const diningPrefs = useFavorites(MAP_DINING_FAVORITES_KEY)
  const gymPrefs = useFavorites(MAP_GYM_FAVORITES_KEY)
  const busPrefs = useBusLayerPrefs()

  const [myDormBuilding, setMyDormBuildingState] = useState<string | null>(null)
  const [housingBuildingNames, setHousingBuildingNames] = useState<string[]>([])
  const [dormInputValue, setDormInputValue] = useState('')
  const [academicCandidates, setAcademicCandidates] = useState<string[]>([])
  const [selectedAcademicBuildings, setSelectedAcademicBuildings] = useState<string[]>([])
  const [busRoutes, setBusRoutes] = useState<{ name: string; code: string; color: string }[]>([])
  const [runningRoutes, setRunningRoutes] = useState<Set<string>>(new Set())
  const [busSettingsOpen, setBusSettingsOpen] = useState(false)
  const [routes, setRoutes] = useState<PassioRoute[]>([])
  const [allBuildingNames, setAllBuildingNames] = useState<string[]>([])

  const [directionsPanelOpen, setDirectionsPanelOpen] = useState(false)
  const [originPoint, setOriginPoint] = useState<DirectionsPoint | null>(null)
  const [destinationPoint, setDestinationPoint] = useState<DirectionsPoint | null>(null)
  const [originInputValue, setOriginInputValue] = useState('')
  const [destinationInputValue, setDestinationInputValue] = useState('')
  const [pickingFor, setPickingFor] = useState<'origin' | 'destination' | 'return' | null>(null)
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null)
  const [selectedOptionKind, setSelectedOptionKind] = useState<'walk-only' | 'walk-bus'>('walk-only')
  const [isPlanningTrip, setIsPlanningTrip] = useState(false)
  const [tripError, setTripError] = useState<string | null>(null)
  const [currentUserLocation, setCurrentUserLocation] = useState<LatLng | null>(null)
  const [autoSearchPending, setAutoSearchPending] = useState(false)
  const [navigating, setNavigating] = useState(false)
  // Whether the map should keep auto-panning to the user's GPS position while navigating.
  // Dragging the map manually turns this off (see the `dragstart` listener) so the view
  // doesn't keep snapping back to the user the instant they let go — Recenter turns it back on.
  const [isFollowingUser, setIsFollowingUser] = useState(true)
  const [activeLegIndex, setActiveLegIndex] = useState(0)
  // Bumped once when the map effect's own fetchUgaBuildings() resolves, so the effect below
  // re-runs applyAcademicMarkers as soon as buildings are ready even if classEntriesQuery's
  // data was already sitting in cache before that (see the effect for why that race matters).
  const [buildingsLoadedTick, setBuildingsLoadedTick] = useState(0)

  // Reactive (not a one-off fetch) specifically so that adding/removing a class on the
  // Schedule page — which writes straight into this same query's cache — is reflected here
  // the moment this page is next rendered, instead of whatever ClassEntry snapshot existed
  // when the map's own setup effect happened to run.
  const classEntriesQuery = useQuery({
    queryKey: CLASS_ENTRIES_KEY,
    queryFn: async () => {
      const { data } = await client.models.ClassEntry.list()
      return data
    },
  })

  const mapActionsRef = useRef<{
    applyLibraryFilter: (selected: string[]) => void
    applyDiningFilter: (selected: string[]) => void
    applyGymFilter: (selected: string[]) => void
    applyAcademicMarkers: (entries: { location?: string | null; courseCode: string; day: string; startTime: string; endTime: string }[], selected: string[]) => void
    applyBusFilter: (disabledRoutes: string[], hideAll: boolean, operatingOnly: boolean) => void
    setMyDorm: (buildingName: string | null) => void
    setDirectionsMarkers: (origin: LatLng | null, destination: LatLng | null) => void
    drawTripPlan: (plan: TripPlan | null, selected: 'walk-only' | 'walk-bus') => void
    setPickMode: (mode: 'origin' | 'destination' | 'return' | null) => void
    startDirectionsTo: (point: { lat: number; lng: number; label: string }) => void
    focusOnPoint: (point: { lat: number; lng: number }) => void
  } | null>(null)

  useEffect(() => {
    mapActionsRef.current?.applyLibraryFilter(libraryPrefs.favorites)
  }, [libraryPrefs.favorites])

  useEffect(() => {
    mapActionsRef.current?.applyDiningFilter(diningPrefs.favorites)
  }, [diningPrefs.favorites])

  useEffect(() => {
    mapActionsRef.current?.applyGymFilter(gymPrefs.favorites)
  }, [gymPrefs.favorites])

  useEffect(() => {
    mapActionsRef.current?.applyBusFilter(busPrefs.disabledRoutes, busPrefs.hideAll, busPrefs.operatingOnly)
  }, [busPrefs.disabledRoutes, busPrefs.hideAll, busPrefs.operatingOnly])

  useEffect(() => {
    mapActionsRef.current?.applyAcademicMarkers(classEntriesQuery.data ?? [], selectedAcademicBuildings)
    // buildingsLoadedTick: fetchUgaBuildings() resolves independently of this query — without
    // it, if classEntriesQuery's data was already cached (e.g. arriving from the Schedule
    // page) before the map's own building fetch finished, this effect would fire once too
    // early with no buildings to match against and never get a second chance to run.
  }, [classEntriesQuery.data, selectedAcademicBuildings, buildingsLoadedTick])

  useEffect(() => {
    mapActionsRef.current?.setDirectionsMarkers(originPoint, destinationPoint)
  }, [originPoint, destinationPoint])

  useEffect(() => {
    mapActionsRef.current?.drawTripPlan(tripPlan, selectedOptionKind)
  }, [tripPlan, selectedOptionKind])

  useEffect(() => {
    mapActionsRef.current?.setPickMode(pickingFor)
  }, [pickingFor])

  // Same option the map is currently drawing (see drawTripPlan) — recomputed here too since
  // live navigation needs it outside that imperative closure (to read the active leg and
  // advance/follow from plain component state instead of plumbing GPS updates through
  // mapActionsRef).
  const activeOption: TripOption | null =
    tripPlan && selectedOptionKind === 'walk-bus' && tripPlan.walkBus ? tripPlan.walkBus : (tripPlan?.walkOnly ?? null)
  const activeLeg = activeOption && activeLegIndex < activeOption.legs.length ? activeOption.legs[activeLegIndex] : null
  const arrived = navigating && activeOption != null && activeLegIndex >= activeOption.legs.length
  // For the walk+bus row's own badge/label in the results list — independent of which option
  // is currently selected/drawn, since both rows render together before you pick one.
  const walkBusLeg = tripPlan?.walkBus?.legs.find((leg): leg is Extract<TripLeg, { kind: 'bus' }> => leg.kind === 'bus')

  // Advances to the next leg once GPS gets close enough to the current leg's endpoint —
  // walking legs end at a stop or the destination, bus legs end at the alighting stop.
  useEffect(() => {
    if (!navigating || !activeLeg || !currentUserLocation) return
    const endPoint = legEndPoint(activeLeg)
    if (!endPoint) return
    const threshold = activeLeg.kind === 'bus' ? BUS_LEG_ADVANCE_THRESHOLD_METERS : WALK_LEG_ADVANCE_THRESHOLD_METERS
    if (haversineDistanceMeters(currentUserLocation, endPoint) < threshold) {
      setActiveLegIndex((index) => index + 1)
    }
  }, [navigating, activeLeg, currentUserLocation])

  // Zooms in once when navigation starts (a nav-appropriate close-in view), separate from the
  // plain pan-along-with-GPS effect below so later position updates don't keep fighting
  // whatever zoom level the user manually sets while navigating.
  useEffect(() => {
    if (!navigating) return
    setIsFollowingUser(true)
    const map = mapRef.current
    if (map && currentUserLocation) {
      map.setView([currentUserLocation.lat, currentUserLocation.lng], Math.max(map.getZoom(), NAVIGATION_ZOOM))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on the false->true transition, see above
  }, [navigating])

  useEffect(() => {
    if (!navigating || !currentUserLocation || !isFollowingUser) return
    mapRef.current?.panTo([currentUserLocation.lat, currentUserLocation.lng], { animate: true })
  }, [navigating, currentUserLocation, isFollowingUser])

  // startDirectionsTo (triggered from a popup's Directions button) sets both points and
  // flips this flag in one go — it can't call handleGetDirections directly since it lives in
  // the mount-only map effect and would only ever see stale origin/destination/stops/routes.
  useEffect(() => {
    if (autoSearchPending && originPoint && destinationPoint) {
      setAutoSearchPending(false)
      handleGetDirections()
    }
  }, [autoSearchPending, originPoint, destinationPoint])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { zoomControl: false }).setView(UGA_CENTER, BASE_ZOOM)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; OpenStreetMap contributors',
      maxZoom: 20,
    }).addTo(map)

    L.polygon(UGA_CAMPUS_BOUNDARY, {
      color: category.campusBoundary,
      weight: 2,
      opacity: 0.6,
      fill: false,
      dashArray: '6 4',
      interactive: false,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const ZoomLevelControl = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create('div', 'leaflet-bar dawghub-zoom-level')
        Object.assign(div.style, {
          background: 'var(--bg)',
          color: 'var(--text)',
          padding: '4px 6px',
          fontSize: '11px',
          fontWeight: '700',
          textAlign: 'center',
          minWidth: '38px',
        })
        return div
      },
    })
    const zoomLevelControl = new ZoomLevelControl({ position: 'bottomright' })
    zoomLevelControl.addTo(map)

    const updateZoomLabel = () => {
      const el = zoomLevelControl.getContainer()
      if (el) el.textContent = `${Math.round(iconScaleForZoom(map.getZoom()) * 100)}%`
    }
    updateZoomLabel()
    map.on('zoom', updateZoomLabel)

    // See isFollowingUser's declaration — a manual drag (any time, not just while navigating;
    // harmless when not navigating since nothing reads this flag then) pauses auto-recentering.
    map.on('dragstart', () => setIsFollowingUser(false))

    let userMarker: L.Marker | null = null
    let accuracyCircle: L.Circle | null = null
    let currentHeading: number | null = null
    let watchId: number | null = null
    let hasCentered = false
    let tracking = false
    // Plain closure variable, not React state — startDirectionsTo (defined once, at mount,
    // in this same effect) needs the latest GPS fix, and a state read there would be frozen
    // at whatever currentUserLocation was when the effect first ran (almost always null).
    let latestUserLocation: LatLng | null = null
    // Set when the Dining tab's "Get Directions" intent opens the panel before GPS has a fix
    // yet — startDirectionsTo already leaves the origin field blank in that case (same as the
    // popup-triggered flow), but here the panel opens immediately at mount, before geolocation
    // has had any real time to resolve, so it's worth backfilling the moment a fix does arrive
    // instead of leaving the user to notice and fill it in by hand.
    let awaitingGpsForDirections = false

    function fillOriginFromGpsIfAwaiting() {
      if (!awaitingGpsForDirections || !latestUserLocation) return
      awaitingGpsForDirections = false
      const label = i18n.t('map.directions.originGpsLabel')
      setOriginPoint({ ...latestUserLocation, label, source: 'gps' })
      setOriginInputValue(label)
      setAutoSearchPending(true)
    }

    function updateUserMarker(lat: number, lng: number, accuracy: number) {
      latestUserLocation = { lat, lng }
      fillOriginFromGpsIfAwaiting()
      setCurrentUserLocation({ lat, lng })
      if (!userMarker) {
        userMarker = L.marker([lat, lng], {
          icon: userLocationIcon(currentHeading),
          zIndexOffset: 1000,
        }).addTo(map)
        accuracyCircle = L.circle([lat, lng], {
          radius: accuracy,
          color: category.userLocation,
          fillColor: category.userLocation,
          fillOpacity: 0.08,
          weight: 1,
        }).addTo(map)
      } else {
        userMarker.setLatLng([lat, lng])
        accuracyCircle?.setLatLng([lat, lng])
        accuracyCircle?.setRadius(accuracy)
      }
    }

    function updateHeading(heading: number) {
      currentHeading = heading
      userMarker?.setIcon(userLocationIcon(currentHeading))
    }

    function handleOrientation(event: DeviceOrientationEvent) {
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading
      if (typeof webkitHeading === 'number') {
        updateHeading(webkitHeading)
      } else if (event.absolute && event.alpha !== null) {
        updateHeading((360 - event.alpha) % 360)
      }
    }

    async function requestOrientationPermission() {
      const DeviceOrientationEventTyped = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
      if (typeof DeviceOrientationEventTyped?.requestPermission === 'function') {
        try {
          const result = await DeviceOrientationEventTyped.requestPermission()
          if (result === 'granted') window.addEventListener('deviceorientation', handleOrientation)
        } catch {
          // iOS denied or unsupported — fall back to GPS course only.
        }
      } else {
        window.addEventListener('deviceorientationabsolute', handleOrientation)
        window.addEventListener('deviceorientation', handleOrientation)
      }
    }

    function stopTracking(button: HTMLElement) {
      tracking = false
      hasCentered = false
      button.style.background = ''
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }
      window.removeEventListener('deviceorientationabsolute', handleOrientation)
      window.removeEventListener('deviceorientation', handleOrientation)
      if (userMarker) {
        map.removeLayer(userMarker)
        userMarker = null
      }
      if (accuracyCircle) {
        map.removeLayer(accuracyCircle)
        accuracyCircle = null
      }
      currentHeading = null
    }

    function startTracking(button: HTMLElement) {
      if (!navigator.geolocation) return
      tracking = true
      button.style.background = category.locateActiveBg

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, heading } = position.coords
          updateUserMarker(latitude, longitude, accuracy)
          if (typeof heading === 'number' && !Number.isNaN(heading)) updateHeading(heading)
          if (!hasCentered) {
            map.setView([latitude, longitude], Math.max(map.getZoom(), BASE_ZOOM))
            hasCentered = true
          }
        },
        () => {
          awaitingGpsForDirections = false
          stopTracking(button)
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
      )

      requestOrientationPermission()
    }

    let locateButton: HTMLElement | null = null

    const LocateControl = L.Control.extend({
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar dawghub-locate-control')
        const button = L.DomUtil.create('a', '', container) as HTMLAnchorElement
        button.href = '#'
        button.title = i18n.t('map.locate')
        button.innerHTML = '📍'
        Object.assign(button.style, {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
        })
        L.DomEvent.disableClickPropagation(container)
        L.DomEvent.on(button, 'click', (event: Event) => {
          L.DomEvent.preventDefault(event)
          if (tracking) stopTracking(button)
          else startTracking(button)
        })
        locateButton = button
        return container
      },
    })
    new LocateControl({ position: 'bottomleft' }).addTo(map)

    // Start tracking as soon as the map mounts, same as tapping the button — the iOS
    // compass-cone permission still can't be requested here (needs a real user gesture,
    // see requestOrientationPermission), so the heading cone just won't show until the
    // user taps the button themselves; the GPS dot itself doesn't have that restriction.
    if (locateButton) startTracking(locateButton)

    const zoomAwareMarkers: { marker: L.Marker; fullIcon: L.DivIcon; dotIcon: L.DivIcon }[] = []

    const updateMarkerDetail = () => {
      const showFull = map.getZoom() >= BASE_ZOOM
      zoomAwareMarkers.forEach(({ marker, fullIcon, dotIcon }) => {
        marker.setIcon(showFull ? fullIcon : dotIcon)
      })
    }
    map.on('zoomend', updateMarkerDetail)

    const routesLayer = L.layerGroup()
    const stopsLayer = L.layerGroup()
    const liveBusLayer = L.layerGroup()
    const busGroup = L.layerGroup([routesLayer, stopsLayer, liveBusLayer]).addTo(map)

    const libraryLayer = L.layerGroup().addTo(map)
    const diningLayer = L.layerGroup().addTo(map)
    const gymLayer = L.layerGroup().addTo(map)
    const housingLayer = L.layerGroup().addTo(map)
    const academicsLayer = L.layerGroup().addTo(map)
    // Ephemeral directions search overlay (pins + drawn route) — not a persistent toggleable
    // layer like the others, so it's not part of layersRef/the Layers drawer.
    const directionsLayer = L.layerGroup().addTo(map)

    layersRef.current = {
      bus: busGroup,
      library: libraryLayer,
      dining: diningLayer,
      gym: gymLayer,
      housing: housingLayer,
      academics: academicsLayer,
    }

    mapRef.current = map

    const housingMarkers: { name: string; marker: L.CircleMarker }[] = []
    const academicMarkers: { name: string; marker: L.CircleMarker }[] = []
    const libraryMarkers: { name: string; marker: L.Marker }[] = []
    const diningMarkers: { name: string; marker: L.Marker }[] = []
    const gymMarkers: { name: string; marker: L.Marker }[] = []
    const routeEntries: { name: string; polylines: L.Polyline[] }[] = []
    const stopMarkers: { name: string; marker: L.CircleMarker }[] = []

    let dormMarker: L.Marker | null = null

    function refreshDormHighlight(dorm: string | null) {
      housingMarkers.forEach(({ marker }) => {
        marker.setStyle({
          radius: BUILDING_DOT_RADIUS,
          color: HOUSING_DOT_COLOR,
          fillColor: HOUSING_DOT_COLOR,
          weight: 0,
          fillOpacity: 0.5,
        })
      })
      if (dormMarker) {
        housingLayer.removeLayer(dormMarker)
        dormMarker = null
      }
      if (!dorm) return
      const entry = housingMarkers.find((m) => m.name === dorm)
      if (!entry) return
      dormMarker = L.marker(entry.marker.getLatLng(), { icon: HOUSE_ICON, zIndexOffset: 500 }).addTo(housingLayer)
      bindReactPopup(
        dormMarker,
        <MapDormPopup
          buildingName={dorm}
          initialIsMyDorm
          onToggle={(next) => {
            const nextDorm = next ? dorm : null
            updateMapPreference({ myDormBuilding: nextDorm }).then((pref) => {
              refreshDormHighlight(pref.myDormBuilding)
            })
            setMyDormBuildingState(nextDorm)
          }}
          onDirections={() => {
            const { lat, lng } = entry.marker.getLatLng()
            startDirectionsTo({ lat, lng, label: dorm })
          }}
        />,
      )
    }

    // Only "my" academic buildings are ever created as markers (see the Academics fetch
    // below), so any academic marker that exists is always styled as "mine" — no separate
    // gray/highlighted distinction needed like the other categories have.
    function applyBuildingFilter(markers: { name: string; marker: L.Layer }[], layer: L.LayerGroup, selected: string[]) {
      const onlySelected = selected.length > 0 ? new Set(selected) : null
      markers.forEach(({ name, marker }) => {
        const shouldShow = !onlySelected || onlySelected.has(name)
        if (shouldShow) {
          if (!layer.hasLayer(marker)) marker.addTo(layer)
        } else {
          layer.removeLayer(marker)
        }
      })
    }

    function applyLibraryFilter(selected: string[]) {
      applyBuildingFilter(libraryMarkers, libraryLayer, selected)
    }
    function applyDiningFilter(selected: string[]) {
      applyBuildingFilter(diningMarkers, diningLayer, selected)
    }
    function applyGymFilter(selected: string[]) {
      applyBuildingFilter(gymMarkers, gymLayer, selected)
    }
    function applyAcademicsFilter(selected: string[]) {
      applyBuildingFilter(academicMarkers, academicsLayer, selected)
    }

    // Set once fetchUgaBuildings() resolves in the Promise.all below — kept outside React
    // state since it only ever feeds this imperative Leaflet code, never rendered directly.
    let loadedBuildings: UgaBuilding[] = []

    // Rebuilds "my academic buildings" markers from scratch every time it's called — driven
    // reactively by classEntriesQuery (see the useEffect above), not a one-off computation at
    // mount, so adding/removing a class on the Schedule page (which writes into that same
    // query's cache) is reflected here without needing to fully reload the map.
    function applyAcademicMarkers(
      entries: { location?: string | null; courseCode: string; day: string; startTime: string; endTime: string }[],
      selected: string[],
    ) {
      academicMarkers.forEach(({ marker }) => academicsLayer.removeLayer(marker))
      academicMarkers.length = 0
      if (loadedBuildings.length === 0) return

      const entriesByBuilding = new Map<string, MapAcademicClass[]>()
      entries.forEach((entry) => {
        if (!entry.location) return
        const building = findBuildingByName(loadedBuildings, entry.location)
        if (!building) return
        const list = entriesByBuilding.get(building.name) ?? []
        list.push({ courseCode: entry.courseCode, day: entry.day, startTime: entry.startTime, endTime: entry.endTime })
        entriesByBuilding.set(building.name, list)
      })

      // Only buildings where the user actually has a class are ever created here — the "my
      // academic buildings" checklist filters which of those are visible, but every marker
      // that exists is by definition "mine", so it's always styled as highlighted.
      loadedBuildings
        .filter((building) => entriesByBuilding.has(building.name))
        .forEach((building) => {
          const marker = L.circleMarker([building.latitude, building.longitude], {
            radius: 6,
            color: MY_ACADEMIC_BORDER,
            fillColor: MY_ACADEMIC_COLOR,
            weight: 2,
            fillOpacity: 0.95,
            bubblingMouseEvents: false,
          })
          bindReactPopup(
            marker,
            <MapAcademicPopup
              buildingName={building.name}
              classes={entriesByBuilding.get(building.name) ?? []}
              onDirections={() =>
                startDirectionsTo({ lat: building.latitude, lng: building.longitude, label: building.name })
              }
            />,
          )
          academicMarkers.push({ name: building.name, marker })
        })

      setAcademicCandidates(Array.from(entriesByBuilding.keys()).sort())
      applyAcademicsFilter(selected)
    }

    let currentDisabledRoutes: string[] = busPrefs.disabledRoutes
    let currentHideAll: boolean = busPrefs.hideAll
    let currentOperatingOnly: boolean = busPrefs.operatingOnly
    const currentRunningRoutes = new Set<string>()
    const busRouteById = new Map<string, string>()

    // Overrides the normal layer-prefs visibility while a trip is on screen: 'hide-all' for a
    // walk-only option (no bus should be visible at all — nothing to disambiguate), or a
    // specific route name for a walk+bus option (only the ridden route — its line, stops, and
    // live buses — stays visible; every other route is hidden outright, not dimmed, so they
    // don't read as "you could also catch this one here"). Null outside of directions mode,
    // where the user's own layer prefs (currentHideAll/currentDisabledRoutes/currentOperatingOnly)
    // apply.
    let directionsBusFocus: 'hide-all' | { routeName: string } | null = null

    function refreshBusVisibility() {
      const prefsShowRoute = (name: string) =>
        !currentHideAll && !currentDisabledRoutes.includes(name) && (!currentOperatingOnly || currentRunningRoutes.has(name))

      const routeVisible = (name: string) => {
        if (directionsBusFocus === 'hide-all') return false
        if (directionsBusFocus) return name === directionsBusFocus.routeName
        return prefsShowRoute(name)
      }
      const focusedRoute = directionsBusFocus && directionsBusFocus !== 'hide-all' ? directionsBusFocus.routeName : null

      routeEntries.forEach(({ name, polylines }) => {
        const shouldShow = routeVisible(name)
        // The ridden route's own full line is drawn dashed — drawTripPlan then paints the
        // actual bus-leg segment as a solid line right on top of it (directionsLayer renders
        // above routesLayer), so only the part of that route NOT part of this trip reads as
        // dashed, and the ridden segment reads solid. Not "other routes are dashed" — other
        // routes aren't shown at all (shouldShow above already hides them entirely).
        const dashedForTrip = focusedRoute !== null && name === focusedRoute
        polylines.forEach((polyline) => {
          if (shouldShow) {
            if (!routesLayer.hasLayer(polyline)) polyline.addTo(routesLayer)
          } else {
            routesLayer.removeLayer(polyline)
          }
          polyline.setStyle(
            dashedForTrip
              ? { weight: 3, opacity: 0.55, dashArray: '4 8' }
              : { weight: 3, opacity: 0.6, dashArray: undefined },
          )
        })
      })

      stopMarkers.forEach(({ name, marker }) => {
        const shouldShow = routeVisible(name)
        if (shouldShow) {
          if (!stopsLayer.hasLayer(marker)) marker.addTo(stopsLayer)
        } else {
          stopsLayer.removeLayer(marker)
        }
      })

      busMarkers.forEach((marker, id) => {
        const busRoute = busRouteById.get(id)
        const shouldShow = !busRoute || routeVisible(busRoute)
        if (shouldShow) {
          if (!liveBusLayer.hasLayer(marker)) marker.addTo(liveBusLayer)
        } else {
          liveBusLayer.removeLayer(marker)
        }
      })
    }

    function applyBusFilter(disabledRoutes: string[], hideAll: boolean, operatingOnly: boolean) {
      currentDisabledRoutes = disabledRoutes
      currentHideAll = hideAll
      currentOperatingOnly = operatingOnly
      refreshBusVisibility()
    }

    function setDirectionsBusFocus(focus: 'hide-all' | { routeName: string } | null) {
      directionsBusFocus = focus
      refreshBusVisibility()
    }

    let originMarker: L.Marker | null = null
    let destinationMarker: L.Marker | null = null
    let tripPolylines: L.Polyline[] = []
    let tripMarkers: L.Marker[] = []

    function setDirectionsMarkers(origin: LatLng | null, destination: LatLng | null) {
      if (originMarker) {
        directionsLayer.removeLayer(originMarker)
        originMarker = null
      }
      if (destinationMarker) {
        directionsLayer.removeLayer(destinationMarker)
        destinationMarker = null
      }
      if (origin) {
        originMarker = L.marker([origin.lat, origin.lng], {
          icon: directionsPinIcon(category.directionsOrigin, 'A'),
          zIndexOffset: 900,
        }).addTo(directionsLayer)
      }
      if (destination) {
        destinationMarker = L.marker([destination.lat, destination.lng], {
          icon: directionsPinIcon(category.directionsDestination, 'B'),
          zIndexOffset: 900,
        }).addTo(directionsLayer)
      }
    }

    function drawTripPlan(plan: TripPlan | null, selected: 'walk-only' | 'walk-bus') {
      tripPolylines.forEach((polyline) => directionsLayer.removeLayer(polyline))
      tripPolylines = []
      tripMarkers.forEach((marker) => directionsLayer.removeLayer(marker))
      tripMarkers = []

      const option = plan && selected === 'walk-bus' && plan.walkBus ? plan.walkBus : plan?.walkOnly
      const busLeg = option?.legs.find((leg): leg is Extract<TripLeg, { kind: 'bus' }> => leg.kind === 'bus')
      // No plan yet → back to the user's own layer prefs. A plan with no bus leg (walk-only
      // selected, or no bus option exists at all) → hide every bus route/stop/live bus, since
      // none of them are part of this trip. A bus leg → focus down to just that route.
      setDirectionsBusFocus(!plan || !option ? null : busLeg ? { routeName: busLeg.routeName } : 'hide-all')

      if (!plan || !option) return
      // A route about to cover the map is more useful than whatever popup happens to still be
      // open from before the search — close it instead of leaving it obstructing the view.
      map.closePopup()
      const bounds: L.LatLngExpression[] = []

      option.legs.forEach((leg) => {
        if (leg.kind === 'walk') {
          const latlngs = leg.route.coordinates.map((point) => [point.lat, point.lng] as [number, number])
          if (latlngs.length < 2) return
          tripPolylines.push(
            L.polyline(latlngs, {
              color: category.directionsWalk,
              weight: 4,
              opacity: 0.85,
              dashArray: '2 8',
              lineCap: 'round',
            }).addTo(directionsLayer),
          )
          bounds.push(...latlngs)
        } else {
          const latlngs = leg.coordinates.map((point) => [point.lat, point.lng] as [number, number])
          if (latlngs.length < 2) return
          tripPolylines.push(
            L.polyline(latlngs, { color: leg.routeColor, weight: 5, opacity: 0.9 }).addTo(directionsLayer),
          )
          // The line's color alone doesn't say which route it is — drop the route's own
          // letter/code at the midpoint of the ridden segment so it's identifiable without
          // having to click through to a popup.
          const midpoint = latlngs[Math.floor(latlngs.length / 2)]
          tripMarkers.push(
            L.marker(midpoint, { icon: routeCodeMarkerIcon(leg.routeColor, leg.routeCode), zIndexOffset: 950 }).addTo(
              directionsLayer,
            ),
          )
          bounds.push(...latlngs)
        }
      })

      if (bounds.length > 0) {
        // Asymmetric padding, not a flat [48, 48] — the top bar and (when results are shown)
        // bottom sheet cover real screen space, so fitBounds needs to know their actual
        // rendered heights or it'll happily center part of the route right underneath them.
        const basePadding = 24
        const topBarHeight = topBarRef.current?.getBoundingClientRect().height ?? 0
        const bottomSheetHeight = bottomSheetRef.current?.getBoundingClientRect().height ?? 0
        map.fitBounds(L.latLngBounds(bounds), {
          paddingTopLeft: [basePadding, topBarHeight + basePadding],
          paddingBottomRight: [basePadding, bottomSheetHeight + basePadding],
        })
      }
    }

    let pickMode: 'origin' | 'destination' | 'return' | null = null

    // Setters from useState are stable across renders (same pattern as setMyDormBuildingState
    // being called directly from this closure elsewhere), so they're safe to close over here
    // without needing to flow through mapActionsRef.
    map.on('click', (event: L.LeafletMouseEvent) => {
      if (!pickMode) return
      if (pickMode === 'return') {
        const pick = pendingPickIntentRef.current
        setPickingFor(null)
        if (pick) {
          navRouteNavigate(pick.returnTo, {
            replace: true,
            state: { draft: pick.draft, pickedLocation: { lat: event.latlng.lat, lng: event.latlng.lng, label: pick.pointLabel } },
          })
        }
        return
      }
      const label = i18n.t('map.directions.pickedPointLabel')
      const point: DirectionsPoint = { lat: event.latlng.lat, lng: event.latlng.lng, label, source: 'map' }
      if (pickMode === 'origin') {
        setOriginPoint(point)
        setOriginInputValue(label)
      } else {
        setDestinationPoint(point)
        setDestinationInputValue(label)
      }
      setPickingFor(null)
    })

    // The "Directions" button inside every non-bus popup calls this (see startDirectionsTo
    // in mapActionsRef) — matches the Google Maps flow of tapping a place then Directions:
    // destination is that place, origin defaults to wherever the GPS dot currently is.
    function startDirectionsTo(point: { lat: number; lng: number; label: string }) {
      setDestinationPoint({ lat: point.lat, lng: point.lng, label: point.label, source: 'building' })
      setDestinationInputValue(point.label)
      if (latestUserLocation) {
        const label = i18n.t('map.directions.originGpsLabel')
        setOriginPoint({ ...latestUserLocation, label, source: 'gps' })
        setOriginInputValue(label)
      } else {
        setOriginPoint(null)
        setOriginInputValue('')
      }
      setTripPlan(null)
      setTripError(null)
      setNavigating(false)
      setActiveLegIndex(0)
      setDirectionsPanelOpen(true)
      setAutoSearchPending(true)
    }

    let rippleMarker: L.Marker | null = null
    let rippleTimeout: ReturnType<typeof setTimeout> | null = null

    function focusOnPoint(point: { lat: number; lng: number }) {
      map.flyTo([point.lat, point.lng], FOCUS_ZOOM, { duration: FOCUS_FLY_DURATION_S })

      if (rippleTimeout) clearTimeout(rippleTimeout)
      if (rippleMarker) map.removeLayer(rippleMarker)
      rippleMarker = L.marker([point.lat, point.lng], { icon: RIPPLE_ICON, interactive: false, zIndexOffset: 1000 }).addTo(
        map,
      )
      rippleTimeout = setTimeout(() => {
        if (rippleMarker) map.removeLayer(rippleMarker)
        rippleMarker = null
      }, RIPPLE_DURATION_MS)
    }

    mapActionsRef.current = {
      applyLibraryFilter,
      applyDiningFilter,
      applyGymFilter,
      applyAcademicMarkers,
      applyBusFilter,
      setMyDorm: (buildingName) => {
        updateMapPreference({ myDormBuilding: buildingName }).then((pref) => {
          refreshDormHighlight(pref.myDormBuilding)
        })
        setMyDormBuildingState(buildingName)
      },
      setDirectionsMarkers,
      drawTripPlan,
      setPickMode: (mode) => {
        pickMode = mode
      },
      startDirectionsTo,
      focusOnPoint,
    }

    // Apply the Dining tab's pending "See Location"/"Get Directions" navigation intent (if
    // any) now that startDirectionsTo/focusOnPoint exist, then scrub it from router state so
    // navigating back to /map later (or refreshing) doesn't replay it. Deliberately NOT nulled
    // out on the ref itself — this effect has a `[]` dep array, so in dev StrictMode it mounts,
    // cleans up (tearing down this exact map instance), and mounts again; nulling the ref here
    // would make the intent fire only on the first, immediately-discarded map and never on the
    // second one that actually survives and reaches the screen.
    const pendingIntent = pendingMapIntentRef.current
    if (pendingIntent) {
      // The GPS watch above centers the map on the user's own position the first time a fix
      // arrives (see the `!hasCentered` branch in startTracking) — without this, that auto-center
      // can land moments after focusOnPoint's flyTo and silently drag the view back to the
      // user, undoing the very thing "See Location"/"Get Directions" just did.
      hasCentered = true
      if (pendingIntent.type === 'directions') {
        startDirectionsTo(pendingIntent)
        // This runs synchronously at mount, well before geolocation.watchPosition's first
        // callback has any real chance to land — flag it so fillOriginFromGpsIfAwaiting can
        // backfill "My current location" (and retrigger the search) the moment a fix arrives.
        if (!latestUserLocation) awaitingGpsForDirections = true
      } else {
        focusOnPoint(pendingIntent)
      }
      navRouteNavigate(navRouteLocation.pathname, { replace: true, state: null })
    } else if (pendingPickIntentRef.current) {
      setPickingFor('return')
      navRouteNavigate(navRouteLocation.pathname, { replace: true, state: null })
    }

    let cancelled = false

    Promise.all([fetchUgaBuildings(), fetchLibraryHoursToday(), fetchMapPreference()])
      .then(([buildings, libraryHours, mapPreference]) => {
        if (cancelled) return

        loadedBuildings = buildings
        setBuildingsLoadedTick((tick) => tick + 1)

        const addNamedMarkers = (
          names: string[],
          markerIcon: L.DivIcon,
          dotIcon: L.DivIcon,
          trackArray: { name: string; marker: L.Marker }[],
          popupContent: (building: UgaBuilding) => ReactNode,
        ) => {
          names.forEach((name) => {
            const building = findBuildingByName(buildings, name)
            if (!building) return
            const marker = L.marker([building.latitude, building.longitude], { icon: markerIcon })
            bindReactPopup(marker, popupContent(building))
            zoomAwareMarkers.push({ marker, fullIcon: markerIcon, dotIcon })
            trackArray.push({ name: building.name, marker })
          })
        }

        const directionsToBuilding = (building: UgaBuilding) => () =>
          startDirectionsTo({ lat: building.latitude, lng: building.longitude, label: building.name })

        addNamedMarkers(LIBRARY_BUILDING_NAMES, LIBRARY_ICON, LIBRARY_DOT, libraryMarkers, (building) => (
          <MapInfoPopup
            name={building.name}
            hours={libraryHours[building.name]}
            onDirections={directionsToBuilding(building)}
          />
        ))
        addNamedMarkers(DINING_BUILDING_NAMES, DINING_ICON, DINING_DOT, diningMarkers, (building) => {
          const hall = getDiningHallByBuildingName(building.name)
          return hall ? (
            <MapDiningPopup hall={hall} label={building.name} onDirections={directionsToBuilding(building)} />
          ) : (
            <MapInfoPopup name={building.name} onDirections={directionsToBuilding(building)} />
          )
        })
        addNamedMarkers(GYM_BUILDING_NAMES, GYM_ICON, GYM_DOT, gymMarkers, (building) => {
          const label = building.name === 'Pound Hall' ? 'Pound Hall & Wheeler Gym' : building.name
          const hours = getGymHoursTodayByBuildingName(building.name)
          return <MapInfoPopup name={label} hours={hours} onDirections={directionsToBuilding(building)} />
        })

        // Tiny dots for now — barely visible until you zoom in, just enough to click.
        // Tapping one lets you flag it as "my dorm" / shows your classes there.
        buildings
          .filter((building) => building.buildingUse === 'Housing')
          .forEach((building) => {
            const marker = L.circleMarker([building.latitude, building.longitude], {
              radius: BUILDING_DOT_RADIUS,
              color: HOUSING_DOT_COLOR,
              fillColor: HOUSING_DOT_COLOR,
              fillOpacity: 0.5,
              weight: 0,
              // Path defaults to bubbling clicks up to the map — without this, tapping a dot
              // while picking a directions point would both open its popup AND drop a pin.
              bubblingMouseEvents: false,
            }).addTo(housingLayer)
            bindReactPopup(marker, (
              <MapDormPopup
                buildingName={building.name}
                initialIsMyDorm={mapPreference.myDormBuilding === building.name}
                onToggle={(next) => {
                  updateMapPreference({ myDormBuilding: next ? building.name : null }).then((pref) => {
                    refreshDormHighlight(pref.myDormBuilding)
                  })
                  setMyDormBuildingState(next ? building.name : null)
                }}
                onDirections={() =>
                  startDirectionsTo({ lat: building.latitude, lng: building.longitude, label: building.name })
                }
              />
            ))
            housingMarkers.push({ name: building.name, marker })
          })

        refreshDormHighlight(mapPreference.myDormBuilding)
        applyLibraryFilter(libraryPrefs.favorites)
        applyDiningFilter(diningPrefs.favorites)
        applyGymFilter(gymPrefs.favorites)
        updateMarkerDetail()

        setMyDormBuildingState(mapPreference.myDormBuilding)
        setHousingBuildingNames(
          buildings
            .filter((building) => building.buildingUse === 'Housing')
            .map((building) => building.name)
            .sort(),
        )
        setSelectedAcademicBuildings(mapPreference.myAcademicBuildings)
        setAllBuildingNames(buildings.map((building) => building.name).sort())
      })
      .catch(() => {
        // Campus building/class layers are a nice-to-have — ignore transient failures.
      })

    queryClient
      .fetchQuery({
        queryKey: ['ugaRoutesAndStops'],
        queryFn: fetchUgaRoutesAndStops,
        staleTime: 30 * 60_000,
      })
      .then(({ routes, stops }) => {
        if (cancelled) return

        routes.forEach((route) => {
          const polylines = route.segments.map((segment) =>
            L.polyline(segment, {
              color: route.color,
              weight: 3,
              opacity: 0.6,
            }).bindPopup(route.name),
          )
          routeEntries.push({ name: route.name, polylines })
        })

        stops.forEach((stop) => {
          const marker = L.circleMarker([stop.latitude, stop.longitude], {
            radius: 3,
            color: stop.color,
            fillColor: stop.color,
            fillOpacity: 0.8,
            weight: 1,
            bubblingMouseEvents: false,
          }).bindPopup(stop.name)
          stopMarkers.push({ name: stop.routeName, marker })
        })

        applyBusFilter(currentDisabledRoutes, currentHideAll, currentOperatingOnly)
        setBusRoutes(routes.map((route) => ({ name: route.name, code: route.code, color: route.color })))
        setRoutes(routes)
      })
      .catch(() => {
        // Routes/stops are a nice-to-have layer — ignore transient failures.
      })

    const busMarkers = new Map<string, L.Marker>()

    async function pollBuses() {
      try {
        const buses = await fetchUgaBuses()
        if (cancelled) return

        const seenIds = new Set<string>()
        currentRunningRoutes.clear()

        buses.forEach((bus) => {
          seenIds.add(bus.id)
          if (bus.route) currentRunningRoutes.add(bus.route)
          busRouteById.set(bus.id, bus.route)
          const target = L.latLng(bus.latitude, bus.longitude)
          const existing = busMarkers.get(bus.id)

          if (existing) {
            existing.setIcon(busHeadingIcon(bus.color, bus.course))
            existing.setPopupContent(bus.route || 'DawgHub Bus')
            animateMarkerTo(existing, target, BUS_ANIMATION_MS, () => cancelled)
          } else {
            const marker = L.marker(target, { icon: busHeadingIcon(bus.color, bus.course) }).bindPopup(
              bus.route || 'DawgHub Bus',
            )
            busMarkers.set(bus.id, marker)
          }
        })

        busMarkers.forEach((marker, id) => {
          if (!seenIds.has(id)) {
            liveBusLayer.removeLayer(marker)
            busMarkers.delete(id)
            busRouteById.delete(id)
          }
        })

        setRunningRoutes(new Set(currentRunningRoutes))
        applyBusFilter(currentDisabledRoutes, currentHideAll, currentOperatingOnly)
      } catch {
        // Transient failure — keep the last known bus positions on screen.
      }
    }

    pollBuses()
    const interval = setInterval(pollBuses, BUS_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
      if (rippleTimeout) clearTimeout(rippleTimeout)
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      window.removeEventListener('deviceorientationabsolute', handleOrientation)
      window.removeEventListener('deviceorientation', handleOrientation)
      map.remove()
      mapRef.current = null
      layersRef.current = null
    }
  }, [])

  function toggleLayer(key: LayerKey) {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      const map = mapRef.current
      const layer = layersRef.current?.[key]
      if (map && layer) {
        if (next[key]) layer.addTo(map)
        else map.removeLayer(layer)
      }
      return next
    })
  }

  const librarySubtitle =
    libraryPrefs.favorites.length === 0
      ? t('map.showAll')
      : t('map.selectedCount', { count: libraryPrefs.favorites.length })
  const diningSubtitle =
    diningPrefs.favorites.length === 0
      ? t('map.showAll')
      : t('map.selectedCount', { count: diningPrefs.favorites.length })
  const gymSubtitle =
    gymPrefs.favorites.length === 0 ? t('map.showAll') : t('map.selectedCount', { count: gymPrefs.favorites.length })
  const housingSubtitle = myDormBuilding ?? t('map.notSet')
  const academicsSubtitle =
    academicCandidates.length === 0
      ? t('map.noAcademicCandidates')
      : selectedAcademicBuildings.length === 0
        ? t('map.showAll')
        : t('map.selectedCount', { count: selectedAcademicBuildings.length })

  const drawerRows: { key: LayerKey; icon: IconDefinition; color: string; label: string; subtitle: string }[] = [
    {
      key: 'library',
      icon: BOOK_OPEN_READER_ICON,
      color: category.library,
      label: t('map.legend.library'),
      subtitle: librarySubtitle,
    },
    {
      key: 'dining',
      icon: UTENSILS_ICON_DEF,
      color: category.dining,
      label: t('map.legend.dining'),
      subtitle: diningSubtitle,
    },
    { key: 'gym', icon: DUMBBELL_ICON_DEF, color: category.gym, label: t('map.legend.gym'), subtitle: gymSubtitle },
    {
      key: 'housing',
      icon: faHouse,
      color: HOUSING_DOT_COLOR,
      label: t('map.legend.housing'),
      subtitle: housingSubtitle,
    },
    {
      key: 'academics',
      icon: BOOK_OPEN_READER_ICON,
      color: ACADEMICS_DOT_COLOR,
      label: t('map.legend.academics'),
      subtitle: academicsSubtitle,
    },
  ]

  function openRow(key: LayerKey) {
    if (key === 'housing') setDormInputValue(myDormBuilding ?? '')
    setActiveModal(key)
  }

  function handleOriginInputChange(value: string) {
    setOriginInputValue(value)
    setOriginPoint(null)
  }
  function handleDestinationInputChange(value: string) {
    setDestinationInputValue(value)
    setDestinationPoint(null)
  }

  function handleSwapPoints() {
    const nextOriginPoint = destinationPoint
    const nextOriginInput = destinationInputValue
    setDestinationPoint(originPoint)
    setDestinationInputValue(originInputValue)
    setOriginPoint(nextOriginPoint)
    setOriginInputValue(nextOriginInput)
  }

  function useMyLocationForOrigin() {
    if (!currentUserLocation) return
    const label = t('map.directions.originGpsLabel')
    setOriginPoint({ ...currentUserLocation, label, source: 'gps' })
    setOriginInputValue(label)
  }
  function useMyLocationForDestination() {
    if (!currentUserLocation) return
    const label = t('map.directions.originGpsLabel')
    setDestinationPoint({ ...currentUserLocation, label, source: 'gps' })
    setDestinationInputValue(label)
  }

  function closeDirectionsPanel() {
    setDirectionsPanelOpen(false)
    setPickingFor(null)
    setOriginPoint(null)
    setDestinationPoint(null)
    setOriginInputValue('')
    setDestinationInputValue('')
    setTripPlan(null)
    setTripError(null)
    setSelectedOptionKind('walk-only')
    setNavigating(false)
    setActiveLegIndex(0)
  }

  function startNavigation() {
    setActiveLegIndex(0)
    setNavigating(true)
  }

  function endNavigation() {
    setNavigating(false)
    setActiveLegIndex(0)
  }

  function handleRecenter() {
    setIsFollowingUser(true)
    if (mapRef.current && currentUserLocation) {
      mapRef.current.panTo([currentUserLocation.lat, currentUserLocation.lng], { animate: true })
    }
  }

  async function resolveDirectionsPoint(point: DirectionsPoint | null, inputValue: string): Promise<DirectionsPoint | null> {
    if (point) return point
    const trimmed = inputValue.trim()
    if (!trimmed) return null
    const buildings = await fetchUgaBuildings()
    const building = findBuildingByName(buildings, trimmed)
    return building ? { lat: building.latitude, lng: building.longitude, label: building.name, source: 'building' } : null
  }

  async function handleGetDirections() {
    setTripError(null)
    setIsPlanningTrip(true)
    setNavigating(false)
    setActiveLegIndex(0)
    try {
      const [origin, destination] = await Promise.all([
        resolveDirectionsPoint(originPoint, originInputValue),
        resolveDirectionsPoint(destinationPoint, destinationInputValue),
      ])
      if (!origin || !destination) {
        setTripPlan(null)
        setTripError(t('map.directions.errorGeneric'))
        return
      }
      setOriginPoint(origin)
      setDestinationPoint(destination)
      const plan = await planTrip(origin, destination, routes)
      setTripPlan(plan)
      setSelectedOptionKind('walk-only')
    } catch {
      setTripPlan(null)
      setTripError(t('map.directions.errorGeneric'))
    } finally {
      setIsPlanningTrip(false)
    }
  }

  function handleCancelPick() {
    const pick = pendingPickIntentRef.current
    setPickingFor(null)
    if (pick) navRouteNavigate(pick.returnTo, { replace: true, state: { draft: pick.draft } })
  }

  function formatDistance(meters: number): string {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`
  }
  function formatDuration(seconds: number): string {
    return t('map.directions.minutes', { count: Math.max(1, Math.round(seconds / 60)) })
  }

  // The step text shown in the navigation HUD for whichever leg is currently active. A walk
  // leg's target differs depending on what follows it — the upcoming stop if a bus leg is
  // next, otherwise the trip's actual destination — so it needs the full legs array, not just
  // the leg in isolation.
  function legInstruction(legs: TripLeg[], index: number): string {
    const leg = legs[index]
    if (leg.kind === 'bus') {
      return t('map.directions.navBoardBus', { route: leg.routeName, stop: leg.toStop.name })
    }
    const nextLeg = legs[index + 1]
    if (nextLeg && nextLeg.kind === 'bus') {
      return t('map.directions.navWalkToStop', { stop: nextLeg.fromStop.name })
    }
    return t('map.directions.navWalkToDestination', {
      destination: destinationPoint?.label ?? t('map.directions.toLabel'),
    })
  }

  // Remaining distance/time for the nav HUD's meta row: the current leg's remaining portion
  // (GPS distance to its endpoint, scaled by that leg's own average pace) plus every leg after
  // it in full — recomputed each render straight from plain state, not memoized, since it's a
  // handful of arithmetic ops gated behind `navigating` anyway.
  const navRemaining = (() => {
    if (!activeOption || !activeLeg || !currentUserLocation || arrived) return null
    const endPoint = legEndPoint(activeLeg)
    if (!endPoint) return null
    const legRemainingDistance = haversineDistanceMeters(currentUserLocation, endPoint)
    const activeLegTotals = legTotals(activeLeg)
    const legRemainingDuration =
      activeLegTotals.distanceMeters > 0
        ? (legRemainingDistance / activeLegTotals.distanceMeters) * activeLegTotals.durationSeconds
        : 0
    const laterLegsTotals = activeOption.legs.slice(activeLegIndex + 1).reduce(
      (sum, leg) => {
        const totals = legTotals(leg)
        return {
          distanceMeters: sum.distanceMeters + totals.distanceMeters,
          durationSeconds: sum.durationSeconds + totals.durationSeconds,
        }
      },
      { distanceMeters: 0, durationSeconds: 0 },
    )
    return {
      distanceMeters: legRemainingDistance + laterLegsTotals.distanceMeters,
      durationSeconds: legRemainingDuration + laterLegsTotals.durationSeconds,
    }
  })()

  return (
    <S.Root>
      <S.MapContainer ref={containerRef} />
      {pickingFor === 'return' && pendingPickIntentRef.current && (
        <S.PickToast>
          {pendingPickIntentRef.current.hint}
          <S.PickToastCancel type="button" onClick={handleCancelPick}>
            {pendingPickIntentRef.current.cancelLabel}
          </S.PickToastCancel>
        </S.PickToast>
      )}
      {!directionsPanelOpen && (
        <>
          <S.LayersButtonSlot>
            <IconButton
              size="lg"
              aria-pressed={drawerOpen}
              aria-label={t('map.layers')}
              onClick={() => setDrawerOpen(true)}
            >
              <FontAwesomeIcon icon={faLayerGroup} />
            </IconButton>
          </S.LayersButtonSlot>
          <S.DirectionsButtonSlot>
            <IconButton
              size="lg"
              aria-pressed={directionsPanelOpen}
              aria-label={t('map.directions.button')}
              onClick={() => setDirectionsPanelOpen(true)}
            >
              <FontAwesomeIcon icon={faRoute} />
            </IconButton>
          </S.DirectionsButtonSlot>
        </>
      )}

      {/* Reuses LayersButtonSlot's top-right position — safe since Layers/Directions (above)
          are only ever shown when directionsPanelOpen is false, and this only shows while
          navigating (which implies directionsPanelOpen is true), so the two never overlap. */}
      {navigating && !isFollowingUser && (
        <S.LayersButtonSlot>
          <IconButton size="lg" aria-label={t('map.directions.recenter')} onClick={handleRecenter}>
            <FontAwesomeIcon icon={faLocationCrosshairs} />
          </IconButton>
        </S.LayersButtonSlot>
      )}

      {directionsPanelOpen && !navigating && (
        <S.DirectionsTopBar ref={topBarRef}>
          <S.DirectionsFieldsWrap>
            <S.DirectionsFieldsColumn>
              <S.DirectionsFieldRow>
                <S.DirectionsFieldDot $color={category.directionsOrigin} />
                <Input
                  list="dawghub-all-building-names"
                  placeholder={t('map.directions.fromPlaceholder')}
                  aria-label={t('map.directions.fromLabel')}
                  value={originInputValue}
                  onChange={(event) => handleOriginInputChange(event.target.value)}
                />
                <S.DirectionsIconButton
                  type="button"
                  aria-label={t('map.directions.useMyLocation')}
                  title={t('map.directions.useMyLocation')}
                  onClick={useMyLocationForOrigin}
                >
                  <FontAwesomeIcon icon={faLocationCrosshairs} />
                </S.DirectionsIconButton>
                <S.DirectionsIconButton
                  type="button"
                  aria-label={t('map.directions.pickOnMap')}
                  title={t('map.directions.pickOnMap')}
                  onClick={() => setPickingFor('origin')}
                >
                  <FontAwesomeIcon icon={faMapPin} />
                </S.DirectionsIconButton>
              </S.DirectionsFieldRow>

              <S.DirectionsFieldRow>
                <S.DirectionsFieldDot $color={category.directionsDestination} $shape="square" />
                <Input
                  list="dawghub-all-building-names"
                  placeholder={t('map.directions.toPlaceholder')}
                  aria-label={t('map.directions.toLabel')}
                  value={destinationInputValue}
                  onChange={(event) => handleDestinationInputChange(event.target.value)}
                />
                <S.DirectionsIconButton
                  type="button"
                  aria-label={t('map.directions.useMyLocation')}
                  title={t('map.directions.useMyLocation')}
                  onClick={useMyLocationForDestination}
                >
                  <FontAwesomeIcon icon={faLocationCrosshairs} />
                </S.DirectionsIconButton>
                <S.DirectionsIconButton
                  type="button"
                  aria-label={t('map.directions.pickOnMap')}
                  title={t('map.directions.pickOnMap')}
                  onClick={() => setPickingFor('destination')}
                >
                  <FontAwesomeIcon icon={faMapPin} />
                </S.DirectionsIconButton>
              </S.DirectionsFieldRow>
            </S.DirectionsFieldsColumn>

            <S.DirectionsActionsColumn>
              <S.DirectionsSwapButton type="button" aria-label={t('map.directions.swap')} onClick={handleSwapPoints}>
                <FontAwesomeIcon icon={faArrowsUpDown} />
              </S.DirectionsSwapButton>
              <S.DirectionsCloseButton
                type="button"
                aria-label={t('map.directions.title')}
                onClick={closeDirectionsPanel}
              >
                <FontAwesomeIcon icon={faXmark} />
              </S.DirectionsCloseButton>
            </S.DirectionsActionsColumn>
          </S.DirectionsFieldsWrap>

          <datalist id="dawghub-all-building-names">
            {allBuildingNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <S.DirectionsSearchButton
            type="button"
            disabled={isPlanningTrip || (!originPoint && !originInputValue.trim()) || (!destinationPoint && !destinationInputValue.trim())}
            onClick={handleGetDirections}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            {isPlanningTrip ? t('map.directions.planning') : t('map.directions.getDirections')}
          </S.DirectionsSearchButton>

          {pickingFor && (
            <S.DirectionsPickToast>
              {t('map.directions.pickHint')}
              <S.DirectionsPickToastCancel type="button" onClick={() => setPickingFor(null)}>
                {t('map.directions.cancelPick')}
              </S.DirectionsPickToastCancel>
            </S.DirectionsPickToast>
          )}
        </S.DirectionsTopBar>
      )}

      {directionsPanelOpen && (tripError || tripPlan) && (
        <S.DirectionsBottomSheet ref={bottomSheetRef}>
          <S.BottomSheetHandle />

          {tripError && <S.TripEmptyState>{tripError}</S.TripEmptyState>}

          {tripPlan && !navigating && (
            <S.TripOptionList>
              <S.TripOptionRow $selected={selectedOptionKind === 'walk-only'}>
                <S.TripOptionRowContent type="button" onClick={() => setSelectedOptionKind('walk-only')}>
                  <S.TripOptionIconBadge $color={category.directionsWalk}>
                    <FontAwesomeIcon icon={faPersonWalking} />
                  </S.TripOptionIconBadge>
                  <S.TripOptionText>
                    <S.TripOptionDuration>{formatDuration(tripPlan.walkOnly.totalDurationSeconds)}</S.TripOptionDuration>
                    <S.TripOptionMeta>
                      {t('map.directions.walkOnly')} · {formatDistance(tripPlan.walkOnly.totalDistanceMeters)}
                    </S.TripOptionMeta>
                  </S.TripOptionText>
                </S.TripOptionRowContent>
                {selectedOptionKind === 'walk-only' && (
                  <S.GoButton type="button" onClick={startNavigation}>
                    <FontAwesomeIcon icon={faPlay} />
                    {t('map.directions.go')}
                  </S.GoButton>
                )}
              </S.TripOptionRow>

              {tripPlan.walkBus ? (
                <S.TripOptionRow $selected={selectedOptionKind === 'walk-bus'}>
                  <S.TripOptionRowContent type="button" onClick={() => setSelectedOptionKind('walk-bus')}>
                    <S.TripOptionIconBadge $color={walkBusLeg?.routeColor ?? category.directionsWalk}>
                      {walkBusLeg ? walkBusLeg.routeCode : <FontAwesomeIcon icon={faBus} />}
                    </S.TripOptionIconBadge>
                    <S.TripOptionText>
                      <S.TripOptionDuration>{formatDuration(tripPlan.walkBus.totalDurationSeconds)}</S.TripOptionDuration>
                      <S.TripOptionMeta>
                        {walkBusLeg
                          ? t('map.directions.walkAndBusRoute', { route: walkBusLeg.routeName })
                          : t('map.directions.walkAndBus')}{' '}
                        · {formatDistance(tripPlan.walkBus.totalDistanceMeters)}
                      </S.TripOptionMeta>
                      <S.TripOptionApproxNote>{t('map.directions.busEtaApprox')}</S.TripOptionApproxNote>
                    </S.TripOptionText>
                  </S.TripOptionRowContent>
                  {selectedOptionKind === 'walk-bus' && (
                    <S.GoButton type="button" onClick={startNavigation}>
                      <FontAwesomeIcon icon={faPlay} />
                      {t('map.directions.go')}
                    </S.GoButton>
                  )}
                </S.TripOptionRow>
              ) : (
                <S.TripEmptyState>{t('map.directions.noBusOption')}</S.TripEmptyState>
              )}
            </S.TripOptionList>
          )}

          {navigating && activeOption && (
            <S.NavHud>
              <S.NavHudTopRow>
                <S.NavHudLegIcon
                  $color={
                    arrived
                      ? category.directionsDestination
                      : activeLeg?.kind === 'bus'
                        ? activeLeg.routeColor
                        : category.directionsWalk
                  }
                >
                  {arrived ? (
                    <FontAwesomeIcon icon={faMapPin} />
                  ) : activeLeg?.kind === 'bus' ? (
                    activeLeg.routeCode
                  ) : (
                    <FontAwesomeIcon icon={faPersonWalking} />
                  )}
                </S.NavHudLegIcon>
                <S.NavHudInstruction>
                  {arrived ? t('map.directions.arrived') : activeLeg ? legInstruction(activeOption.legs, activeLegIndex) : ''}
                </S.NavHudInstruction>
                <S.DirectionsCloseButton
                  type="button"
                  aria-label={t('map.directions.endNavigation')}
                  onClick={endNavigation}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </S.DirectionsCloseButton>
              </S.NavHudTopRow>

              {navRemaining && (
                <S.NavHudMeta>
                  {formatDistance(navRemaining.distanceMeters)} ·{' '}
                  {t('map.directions.navTotalRemaining', { duration: formatDuration(navRemaining.durationSeconds) })}
                </S.NavHudMeta>
              )}

              <S.NavProgressTrack>
                {activeOption.legs.map((leg, index) => (
                  <S.NavProgressSegment
                    key={index}
                    $weight={Math.max(legTotals(leg).distanceMeters, 20)}
                    $color={leg.kind === 'bus' ? leg.routeColor : category.directionsWalk}
                    $state={index < activeLegIndex || arrived ? 'done' : index === activeLegIndex ? 'active' : 'upcoming'}
                  />
                ))}
              </S.NavProgressTrack>
            </S.NavHud>
          )}
        </S.DirectionsBottomSheet>
      )}

      {!directionsPanelOpen && <S.BusButtonRow>
        <IconButton
          size="lg"
          aria-pressed={busPrefs.panelOpen}
          aria-label={t('map.legend.bus')}
          onClick={() => busPrefs.setPanelOpen(!busPrefs.panelOpen)}
        >
          <FontAwesomeIcon icon={faBus} />
        </IconButton>
        {busPrefs.panelOpen && (
          <>
            <IconButton
              size="lg"
              aria-label={t('map.bus.allOn')}
              title={t('map.bus.allOn')}
              onClick={() => busPrefs.setDisabledRoutes([])}
            >
              <FontAwesomeIcon icon={faEye} />
            </IconButton>
            <IconButton
              size="lg"
              aria-label={t('map.bus.allOff')}
              title={t('map.bus.allOff')}
              onClick={() => busPrefs.setDisabledRoutes(busRoutes.map((route) => route.name))}
            >
              <FontAwesomeIcon icon={faEyeSlash} />
            </IconButton>
          </>
        )}
      </S.BusButtonRow>}

      {!directionsPanelOpen &&
        busPrefs.panelOpen &&
        (busRoutes.length === 0 ? (
          <S.BusPanel>
            <S.ChecklistEmpty>{t('map.noRoutesYet')}</S.ChecklistEmpty>
          </S.BusPanel>
        ) : (
          <S.BusPanel>
            <S.BusRouteGrid>
              {[...busRoutes]
                .sort((a, b) => {
                  const aOperating = runningRoutes.has(a.name)
                  const bOperating = runningRoutes.has(b.name)
                  if (aOperating !== bOperating) return aOperating ? -1 : 1
                  return a.name.localeCompare(b.name)
                })
                .map((route) => {
                  const operating = runningRoutes.has(route.name)
                  const enabled = !busPrefs.disabledRoutes.includes(route.name)
                  const label = operating ? route.name : `${route.name} (${t('map.bus.notOperating')})`
                  return (
                    <S.BusRouteBadge
                      key={route.name}
                      type="button"
                      $background={route.color}
                      $enabled={enabled}
                      $operating={operating}
                      aria-label={label}
                      aria-pressed={enabled}
                      title={label}
                      onClick={() => busPrefs.toggleRoute(route.name)}
                    >
                      {route.code}
                    </S.BusRouteBadge>
                  )
                })}
            </S.BusRouteGrid>
            <S.BusSettingsButton type="button" aria-label={t('map.bus.settings')} onClick={() => setBusSettingsOpen(true)}>
              <FontAwesomeIcon icon={faGear} />
            </S.BusSettingsButton>
          </S.BusPanel>
        ))}

      {busSettingsOpen && (
        <Modal onClose={() => setBusSettingsOpen(false)}>
          <S.ModalHeader>
            <S.ModalTitle>{t('map.legend.bus')}</S.ModalTitle>
            <IconButton aria-label={t('map.legend.bus')} onClick={() => setBusSettingsOpen(false)}>
              <FontAwesomeIcon icon={faXmark} />
            </IconButton>
          </S.ModalHeader>
          <S.ModalBody>
            <S.MasterToggleRow>
              <S.MasterToggleLabel>{t('map.showLayer')}</S.MasterToggleLabel>
              <S.Switch
                type="button"
                $checked={!busPrefs.hideAll}
                aria-pressed={!busPrefs.hideAll}
                onClick={() => busPrefs.setHideAll(!busPrefs.hideAll)}
              />
            </S.MasterToggleRow>
            <S.MasterToggleRow>
              <S.MasterToggleLabel>{t('map.bus.operatingOnly')}</S.MasterToggleLabel>
              <S.Switch
                type="button"
                $checked={busPrefs.operatingOnly}
                aria-pressed={busPrefs.operatingOnly}
                onClick={() => busPrefs.setOperatingOnly(!busPrefs.operatingOnly)}
              />
            </S.MasterToggleRow>
            <S.ModalSection>
              <S.ModalSectionTitle>{t('map.bus.perRoute')}</S.ModalSectionTitle>
              {busRoutes.length === 0 ? (
                <S.ChecklistEmpty>{t('map.noRoutesYet')}</S.ChecklistEmpty>
              ) : (
                <S.ChecklistGroup>
                  {[...busRoutes]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((route) => (
                      <S.ChecklistRow key={route.name}>
                        <input
                          type="checkbox"
                          checked={!busPrefs.disabledRoutes.includes(route.name)}
                          onChange={() => busPrefs.toggleRoute(route.name)}
                        />
                        <S.LayerChipIcon $background={route.color}>{route.code}</S.LayerChipIcon>
                        {route.name}
                      </S.ChecklistRow>
                    ))}
                </S.ChecklistGroup>
              )}
            </S.ModalSection>
          </S.ModalBody>
        </Modal>
      )}

      {drawerOpen && (
        <>
          <S.DrawerBackdrop onClick={() => setDrawerOpen(false)} />
          <S.Drawer>
            <S.DrawerHeader>
              <S.DrawerTitle>{t('map.layers')}</S.DrawerTitle>
              <IconButton aria-label={t('schedule.close')} onClick={() => setDrawerOpen(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </IconButton>
            </S.DrawerHeader>
            <S.DrawerList>
              {drawerRows.map((row) => (
                <S.DrawerRow key={row.key} type="button" onClick={() => openRow(row.key)}>
                  <S.LayerChipIcon $background={row.color}>
                    <FontAwesomeIcon icon={row.icon} />
                  </S.LayerChipIcon>
                  <S.DrawerRowText>
                    <S.DrawerRowLabel $active={visible[row.key]}>{row.label}</S.DrawerRowLabel>
                    <S.DrawerRowSubtitle>{row.subtitle}</S.DrawerRowSubtitle>
                  </S.DrawerRowText>
                  <S.DrawerRowChevron>
                    <FontAwesomeIcon icon={faChevronRight} />
                  </S.DrawerRowChevron>
                </S.DrawerRow>
              ))}
            </S.DrawerList>
          </S.Drawer>
        </>
      )}

      {activeModal === 'library' && (
        <LayerChecklistModal
          title={t('map.legend.library')}
          active={visible.library}
          onToggleActive={() => toggleLayer('library')}
          names={LIBRARY_BUILDING_NAMES}
          selected={libraryPrefs.favorites}
          onToggleName={(name) =>
            libraryPrefs.setFavorites(toggleInEffectiveList(name, LIBRARY_BUILDING_NAMES, libraryPrefs.favorites))
          }
          onClose={() => setActiveModal(null)}
          emptyMessage={t('map.showAll')}
          showLabel={t('map.showLayer')}
        />
      )}

      {activeModal === 'dining' && (
        <LayerChecklistModal
          title={t('map.legend.dining')}
          active={visible.dining}
          onToggleActive={() => toggleLayer('dining')}
          names={DINING_BUILDING_NAMES}
          selected={diningPrefs.favorites}
          onToggleName={(name) =>
            diningPrefs.setFavorites(toggleInEffectiveList(name, DINING_BUILDING_NAMES, diningPrefs.favorites))
          }
          onClose={() => setActiveModal(null)}
          emptyMessage={t('map.showAll')}
          showLabel={t('map.showLayer')}
        />
      )}

      {activeModal === 'gym' && (
        <LayerChecklistModal
          title={t('map.legend.gym')}
          active={visible.gym}
          onToggleActive={() => toggleLayer('gym')}
          names={GYM_BUILDING_NAMES}
          selected={gymPrefs.favorites}
          onToggleName={(name) =>
            gymPrefs.setFavorites(toggleInEffectiveList(name, GYM_BUILDING_NAMES, gymPrefs.favorites))
          }
          onClose={() => setActiveModal(null)}
          emptyMessage={t('map.showAll')}
          showLabel={t('map.showLayer')}
        />
      )}

      {activeModal === 'academics' && (
        <LayerChecklistModal
          title={t('map.legend.academics')}
          active={visible.academics}
          onToggleActive={() => toggleLayer('academics')}
          names={academicCandidates}
          selected={selectedAcademicBuildings}
          onToggleName={(name) => {
            const next = toggleInEffectiveList(name, academicCandidates, selectedAcademicBuildings)
            setSelectedAcademicBuildings(next)
            updateMapPreference({ myAcademicBuildings: next })
          }}
          onClose={() => setActiveModal(null)}
          emptyMessage={t('map.noAcademicCandidates')}
          showLabel={t('map.showLayer')}
        />
      )}

      {activeModal === 'housing' && (
        <Modal onClose={() => setActiveModal(null)}>
          <S.ModalHeader>
            <S.ModalTitle>{t('map.legend.housing')}</S.ModalTitle>
            <IconButton aria-label={t('map.legend.housing')} onClick={() => setActiveModal(null)}>
              <FontAwesomeIcon icon={faXmark} />
            </IconButton>
          </S.ModalHeader>
          <S.ModalBody>
            <S.MasterToggleRow>
              <S.MasterToggleLabel>{t('map.showLayer')}</S.MasterToggleLabel>
              <S.Switch
                type="button"
                $checked={visible.housing}
                aria-pressed={visible.housing}
                onClick={() => toggleLayer('housing')}
              />
            </S.MasterToggleRow>
            <S.ModalSection>
              <S.ModalSectionTitle>{t('map.myDorm')}</S.ModalSectionTitle>
              <Input
                list="dawghub-housing-names"
                placeholder={t('map.myDormPlaceholder')}
                value={dormInputValue}
                onChange={(event) => setDormInputValue(event.target.value)}
              />
              <datalist id="dawghub-housing-names">
                {housingBuildingNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <Button
                type="button"
                disabled={!housingBuildingNames.includes(dormInputValue)}
                onClick={() => {
                  mapActionsRef.current?.setMyDorm(dormInputValue)
                  setActiveModal(null)
                }}
              >
                {t('schedule.save')}
              </Button>
              {myDormBuilding && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    mapActionsRef.current?.setMyDorm(null)
                    setDormInputValue('')
                    setActiveModal(null)
                  }}
                >
                  {t('map.myDormSet')}
                </Button>
              )}
            </S.ModalSection>
          </S.ModalBody>
        </Modal>
      )}
    </S.Root>
  )
}
