import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
  faBookOpenReader,
  faBus,
  faChevronRight,
  faDumbbell,
  faHouse,
  faLayerGroup,
  faUtensils,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '../../design-system/Button/Button'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { Input } from '../../design-system/Input/Input'
import { useFavorites } from '../../lib/useFavorites'
import {
  MAP_DINING_FAVORITES_KEY,
  MAP_GYM_FAVORITES_KEY,
  MAP_LIBRARY_FAVORITES_KEY,
  useBusLayerPrefs,
  type BusMode,
} from '../../lib/mapLayerPrefs'
import { fetchUgaBuses, fetchUgaRoutesAndStops } from '../../lib/passio'
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

function faMarkerIcon(definition: IconDefinition, background: string) {
  const svgHtml = renderFaIcon(definition, {
    styles: { color: brand.white, width: '11px', height: '11px' },
  }).html[0]
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${background};box-shadow:0 1px 3px rgba(0,0,0,0.35);">${svgHtml}</div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function dotMarkerIcon(background: string) {
  return L.divIcon({
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${background};box-shadow:0 0 0 2px rgba(255,255,255,0.85);"></div>`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

const LIBRARY_ICON = faMarkerIcon(BOOK_OPEN_READER_ICON, category.library)
const LIBRARY_DOT = dotMarkerIcon(category.library)
const DINING_ICON = faMarkerIcon(UTENSILS_ICON_DEF, category.dining)
const DINING_DOT = dotMarkerIcon(category.dining)
const GYM_ICON = faMarkerIcon(DUMBBELL_ICON_DEF, category.gym)
const GYM_DOT = dotMarkerIcon(category.gym)
const HOUSE_ICON = faMarkerIcon(faHouse, MY_DORM_COLOR)

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

function busHeadingIcon(color: string, course: number) {
  const heading = Number.isFinite(course) ? course : 0
  return L.divIcon({
    html: `<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
      <div style="width:100%;height:100%;transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;">
        <svg width="17" height="17" viewBox="0 0 24 24">
          <path d="M12 2 L20 21 L12 16 L4 21 Z" fill="${color}" stroke="${brand.white}" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
      </div>
    </div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
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
    <S.ModalBackdrop onClick={onClose}>
      <S.Modal onClick={(event) => event.stopPropagation()}>
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
      </S.Modal>
    </S.ModalBackdrop>
  )
}

export function MapPage() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<Record<LayerKey, L.LayerGroup> | null>(null)
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
  const [busRouteNames, setBusRouteNames] = useState<string[]>([])

  const mapActionsRef = useRef<{
    applyLibraryFilter: (selected: string[]) => void
    applyDiningFilter: (selected: string[]) => void
    applyGymFilter: (selected: string[]) => void
    applyAcademicsFilter: (selected: string[]) => void
    applyBusFilter: (mode: BusMode, selected: string[]) => void
    setMyDorm: (buildingName: string | null) => void
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
    mapActionsRef.current?.applyBusFilter(busPrefs.mode, busPrefs.selectedRoutes)
  }, [busPrefs.mode, busPrefs.selectedRoutes])

  useEffect(() => {
    mapActionsRef.current?.applyAcademicsFilter(selectedAcademicBuildings)
  }, [selectedAcademicBuildings])

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

    let userMarker: L.Marker | null = null
    let accuracyCircle: L.Circle | null = null
    let currentHeading: number | null = null
    let watchId: number | null = null
    let hasCentered = false
    let tracking = false

    function updateUserMarker(lat: number, lng: number, accuracy: number) {
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
        () => stopTracking(button),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
      )

      requestOrientationPermission()
    }

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
        return container
      },
    })
    new LocateControl({ position: 'bottomleft' }).addTo(map)

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

    let currentBusMode: BusMode = busPrefs.mode
    let currentBusSelected: string[] = busPrefs.selectedRoutes
    const currentRunningRoutes = new Set<string>()
    const busRouteById = new Map<string, string>()

    function applyBusFilter(mode: BusMode, selected: string[]) {
      currentBusMode = mode
      currentBusSelected = selected

      const shouldShowRoute = (name: string) =>
        mode === 'all' ? true : mode === 'running' ? currentRunningRoutes.has(name) : selected.includes(name)

      routeEntries.forEach(({ name, polylines }) => {
        const shouldShow = shouldShowRoute(name)
        polylines.forEach((polyline) => {
          if (shouldShow) {
            if (!routesLayer.hasLayer(polyline)) polyline.addTo(routesLayer)
          } else {
            routesLayer.removeLayer(polyline)
          }
        })
      })

      stopMarkers.forEach(({ name, marker }) => {
        const shouldShow = shouldShowRoute(name)
        if (shouldShow) {
          if (!stopsLayer.hasLayer(marker)) marker.addTo(stopsLayer)
        } else {
          stopsLayer.removeLayer(marker)
        }
      })

      busMarkers.forEach((marker, id) => {
        const busRoute = busRouteById.get(id)
        const shouldShow = mode === 'custom' ? !!busRoute && selected.includes(busRoute) : true
        if (shouldShow) {
          if (!liveBusLayer.hasLayer(marker)) marker.addTo(liveBusLayer)
        } else {
          liveBusLayer.removeLayer(marker)
        }
      })
    }

    mapActionsRef.current = {
      applyLibraryFilter,
      applyDiningFilter,
      applyGymFilter,
      applyAcademicsFilter,
      applyBusFilter,
      setMyDorm: (buildingName) => {
        updateMapPreference({ myDormBuilding: buildingName }).then((pref) => {
          refreshDormHighlight(pref.myDormBuilding)
        })
        setMyDormBuildingState(buildingName)
      },
    }

    let cancelled = false

    Promise.all([
      fetchUgaBuildings(),
      fetchLibraryHoursToday(),
      fetchMapPreference(),
      queryClient.fetchQuery({
        queryKey: CLASS_ENTRIES_KEY,
        queryFn: async () => {
          const { data } = await client.models.ClassEntry.list()
          return data
        },
      }),
    ])
      .then(([buildings, libraryHours, mapPreference, entries]) => {
        if (cancelled) return

        const entriesByBuilding = new Map<string, MapAcademicClass[]>()
        entries.forEach((entry) => {
          if (!entry.location) return
          const building = findBuildingByName(buildings, entry.location)
          if (!building) return
          const list = entriesByBuilding.get(building.name) ?? []
          list.push({
            courseCode: entry.courseCode,
            day: entry.day,
            startTime: entry.startTime,
            endTime: entry.endTime,
          })
          entriesByBuilding.set(building.name, list)
        })
        const academicCandidateNames = Array.from(entriesByBuilding.keys()).sort()

        const addNamedMarkers = (
          names: string[],
          markerIcon: L.DivIcon,
          dotIcon: L.DivIcon,
          trackArray: { name: string; marker: L.Marker }[],
          popupContent: (building: UgaBuilding) => ReactNode = (building) => (
            <MapInfoPopup name={building.name} />
          ),
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

        addNamedMarkers(LIBRARY_BUILDING_NAMES, LIBRARY_ICON, LIBRARY_DOT, libraryMarkers, (building) => (
          <MapInfoPopup name={building.name} hours={libraryHours[building.name]} />
        ))
        addNamedMarkers(DINING_BUILDING_NAMES, DINING_ICON, DINING_DOT, diningMarkers, (building) => {
          const hall = getDiningHallByBuildingName(building.name)
          return hall ? (
            <MapDiningPopup hall={hall} label={building.name} />
          ) : (
            <MapInfoPopup name={building.name} />
          )
        })
        addNamedMarkers(GYM_BUILDING_NAMES, GYM_ICON, GYM_DOT, gymMarkers, (building) => {
          const label = building.name === 'Pound Hall' ? 'Pound Hall & Wheeler Gym' : building.name
          const hours = getGymHoursTodayByBuildingName(building.name)
          return <MapInfoPopup name={label} hours={hours} />
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
              />
            ))
            housingMarkers.push({ name: building.name, marker })
          })

        // Only buildings where the user actually has a class are ever created here — the
        // "my academic buildings" checklist filters which of those are visible, but every
        // marker that exists is by definition "mine", so it's always styled as highlighted.
        buildings
          .filter((building) => entriesByBuilding.has(building.name))
          .forEach((building) => {
            const marker = L.circleMarker([building.latitude, building.longitude], {
              radius: 6,
              color: MY_ACADEMIC_BORDER,
              fillColor: MY_ACADEMIC_COLOR,
              weight: 2,
              fillOpacity: 0.95,
            })
            bindReactPopup(
              marker,
              <MapAcademicPopup buildingName={building.name} classes={entriesByBuilding.get(building.name) ?? []} />,
            )
            academicMarkers.push({ name: building.name, marker })
          })

        refreshDormHighlight(mapPreference.myDormBuilding)
        applyLibraryFilter(libraryPrefs.favorites)
        applyDiningFilter(diningPrefs.favorites)
        applyGymFilter(gymPrefs.favorites)
        applyAcademicsFilter(mapPreference.myAcademicBuildings)
        updateMarkerDetail()

        setMyDormBuildingState(mapPreference.myDormBuilding)
        setHousingBuildingNames(
          buildings
            .filter((building) => building.buildingUse === 'Housing')
            .map((building) => building.name)
            .sort(),
        )
        setAcademicCandidates(academicCandidateNames)
        setSelectedAcademicBuildings(mapPreference.myAcademicBuildings)
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
          }).bindPopup(stop.name)
          stopMarkers.push({ name: stop.routeName, marker })
        })

        applyBusFilter(currentBusMode, currentBusSelected)
        setBusRouteNames(routes.map((route) => route.name).sort())
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

        applyBusFilter(currentBusMode, currentBusSelected)
      } catch {
        // Transient failure — keep the last known bus positions on screen.
      }
    }

    pollBuses()
    const interval = setInterval(pollBuses, BUS_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
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

  const busSubtitle =
    busPrefs.mode === 'running'
      ? t('map.busMode.running')
      : busPrefs.mode === 'all'
        ? t('map.busMode.all')
        : t('map.selectedCount', { count: busPrefs.selectedRoutes.length })

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
    { key: 'bus', icon: faBus, color: category.bus, label: t('map.legend.bus'), subtitle: busSubtitle },
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

  return (
    <S.Root>
      <S.MapContainer ref={containerRef} />
      <S.LayersButton
        type="button"
        $active={drawerOpen}
        aria-label={t('map.layers')}
        onClick={() => setDrawerOpen(true)}
      >
        <FontAwesomeIcon icon={faLayerGroup} />
      </S.LayersButton>

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

      {activeModal === 'bus' && (
        <S.ModalBackdrop onClick={() => setActiveModal(null)}>
          <S.Modal onClick={(event) => event.stopPropagation()}>
            <S.ModalHeader>
              <S.ModalTitle>{t('map.legend.bus')}</S.ModalTitle>
              <IconButton aria-label={t('map.legend.bus')} onClick={() => setActiveModal(null)}>
                <FontAwesomeIcon icon={faXmark} />
              </IconButton>
            </S.ModalHeader>
            <S.ModalBody>
              <S.MasterToggleRow>
                <S.MasterToggleLabel>{t('map.showLayer')}</S.MasterToggleLabel>
                <S.Switch
                  type="button"
                  $checked={visible.bus}
                  aria-pressed={visible.bus}
                  onClick={() => toggleLayer('bus')}
                />
              </S.MasterToggleRow>
              <S.ModalSection>
                <S.ModalSectionTitle>{t('map.busMode.title')}</S.ModalSectionTitle>
                <S.RadioGroup>
                  <S.RadioRow>
                    <input
                      type="radio"
                      name="busMode"
                      checked={busPrefs.mode === 'running'}
                      onChange={() => busPrefs.setMode('running')}
                    />
                    {t('map.busMode.running')}
                  </S.RadioRow>
                  <S.RadioRow>
                    <input
                      type="radio"
                      name="busMode"
                      checked={busPrefs.mode === 'all'}
                      onChange={() => busPrefs.setMode('all')}
                    />
                    {t('map.busMode.all')}
                  </S.RadioRow>
                  <S.RadioRow>
                    <input
                      type="radio"
                      name="busMode"
                      checked={busPrefs.mode === 'custom'}
                      onChange={() => busPrefs.setMode('custom')}
                    />
                    {t('map.busMode.custom')}
                  </S.RadioRow>
                </S.RadioGroup>
              </S.ModalSection>
              {busPrefs.mode === 'custom' && (
                <S.ModalSection>
                  <S.ModalSectionTitle>{t('map.busMode.selectRoutes')}</S.ModalSectionTitle>
                  {busRouteNames.length === 0 ? (
                    <S.ChecklistEmpty>{t('map.noRoutesYet')}</S.ChecklistEmpty>
                  ) : (
                    <S.ChecklistGroup>
                      {busRouteNames.map((name) => (
                        <S.ChecklistRow key={name}>
                          <input
                            type="checkbox"
                            checked={busPrefs.selectedRoutes.includes(name)}
                            onChange={() => busPrefs.toggleRoute(name)}
                          />
                          {name}
                        </S.ChecklistRow>
                      ))}
                    </S.ChecklistGroup>
                  )}
                </S.ModalSection>
              )}
            </S.ModalBody>
          </S.Modal>
        </S.ModalBackdrop>
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
        <S.ModalBackdrop onClick={() => setActiveModal(null)}>
          <S.Modal onClick={(event) => event.stopPropagation()}>
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
          </S.Modal>
        </S.ModalBackdrop>
      )}
    </S.Root>
  )
}
