import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';
declare module 'leaflet' {
  interface MarkerOptions {
    rotationAngle?: number;
    transform?: number;
  }
}
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  Airform !: FormGroup;
  selectedAirport: string[] = [];
  selectedRunway: string[] = [];
  selectedTypeofProcedure: string[] = [];
  selectedProcedureName: string[] = [];
  private firLayer!: L.GeoJSON;
  lineGeoJsonLayer!: L.GeoJSON;
  geoJsonLayer!: L.GeoJSON;
  map!: L.Map;
  airportLayerGroup!: any;
  private geoServerLayer!: L.TileLayer.WMS;
  constructor(private formbuilder: FormBuilder,) { }
  optionsAirport: { value: any; label: any; }[] = [
    { value: 'VOBL/Bengaluru (KIA)', label: 'VOBL/BLR/Bengaluru' },
    { value: 'VEPY/PAKYONG', label: 'VEPY/PYG/Pakyong' },
    { value: 'VIJP/JAIPUR', label: 'VIJP/JAI/Jaipur' },];
  optionsBengaluruKIARunway: { value: any; label: any; }[] = [];
  optionsVIJPJAIPURRunway: { value: any; label: any; }[] = [];
  optionsVEPYPAKYONGRunway: { value: any; label: any; }[] = [];
  optionsRWY_09TypeofProcedure: { value: any; label: any; }[] = [];
  optionsRWY_27TypeofProcedure: { value: any; label: any; }[] = [];
  optionsRWY_02TypeofProcedure: { value: any; label: any; }[] = [];
  optionsRWY_20TypeofProcedure: { value: any; label: any; }[] = [];
  optionsRWY_09LTypeofProcedure: { value: any; label: any; }[] = [];
  optionsRWY_27RTypeofProcedure: { value: any; label: any; }[] = [];
  optionsVEPYTypeofProcedure: { value: any; label: any; }[] = [];
  optionsProcedureName: { value: any; label: any; }[] = [];

  ngOnInit(): void {
    this.Airform = this.formbuilder.group({
      selectedAirport: [[]],
      selectedRunway: [[]],
      selectedTypeofProcedure: [[]],
      selectedProcedureName: [[]],
    });
    this.initMap();
    this.watchAirportChanges();
  }
  private initMap(): void {
    this.map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20.5937, 78.9629], 4);

    const streets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    });

    const darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {});

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {});

    const navigation = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16
    });

    const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const googleTerrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const baseMaps = {
      'Streets': streets,
      'Satellite': satellite,
      'Navigation': navigation,
      'Hybrid': googleHybrid,
      'Satellite Google': googleSat,
      'Terrain': googleTerrain,
      'Dark': darkMatter
    };

    const overlayMaps = {};

    L.control.layers(baseMaps, overlayMaps, { position: 'topleft' }).addTo(this.map);
    streets.addTo(this.map);
    L.control.scale({ position: 'bottomright', metric: false }).addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.airportLayerGroup = L.layerGroup().addTo(this.map);
  }

  updateLayers(): void {
    // Clear existing layers
    this.airportLayerGroup.clearLayers();

    const loadSIDProcedure = async (procedureName: string, pointFileName: string, lineFileName: string, iconFileName: string) => {
      try {

        // Load runway GeoJSON data
        const runwayIcon = L.icon({
          iconUrl: 'assets/AKTIM_7A/RWY.png',
          iconSize: [20, 30],
          iconAnchor: [10, 30]
        });

        const runwayResponse = await fetch(iconFileName);
        const runwayData = await runwayResponse.json();

        const geoLayer = L.geoJSON(runwayData, {
          pointToLayer: (feature, latlng) => {
            const trueB = parseFloat(feature.properties.True_B);
            let marker: L.Marker<any>;

            if (!isNaN(trueB)) {
              const rotationAngle = trueB
              console.log(rotationAngle)
              marker = L.marker(latlng, { icon: runwayIcon, rotationAngle: rotationAngle });
            } else {
              console.error('Invalid True_B value:', feature.properties.True_B);
              // Create a transparent marker as a fallback
              marker = L.marker(latlng, { opacity: 0 });
            }

            return marker;
          }
        });

        this.airportLayerGroup.addLayer(geoLayer);
        // this.map.fitBounds(geoLayer.getBounds());

        // Load Point_SID GeoJSON data
        const pointResponse = await fetch(pointFileName);
        const pointData = await pointResponse.json();

        const stepIcon = L.icon({
          iconUrl: 'assets/AKTIM_7A/Fly-by.png',
          iconSize: [40, 40],
          popupAnchor: [-3, -76],
          // bgPos: [0, 0],
        });

        const geoJsonLayer = L.geoJSON(pointData, {
          pointToLayer: (feature, latlng) => {
            const marker = L.marker(latlng, { icon: stepIcon });

            let tooltipContent = '';
            if (feature.properties.Name) {
              tooltipContent += `<b>${feature.properties.Name}</b><br>`;
            }

            if (feature.properties.Altitude) {
              tooltipContent += `${feature.properties.Altitude}<br>`;
            }
            if (feature.properties.Speed) {
              tooltipContent += `${feature.properties.Speed}<br>`;
            }
            if (feature.properties.Speed1) {
              tooltipContent += `${feature.properties.Speed1}`;
            }

            if (tooltipContent !== '') {
              marker.bindTooltip(tooltipContent, {
                permanent: true,
                direction: 'bottom',
                className: 'labelstyle',
                offset: L.point(25, 0),
              });
            }

            return marker;
          }

        });

        this.airportLayerGroup.addLayer(geoJsonLayer);
        this.map.fitBounds(geoJsonLayer.getBounds());

        // Load Line_SID GeoJSON data
        const lineResponse = await fetch(lineFileName);
        const lineData = await lineResponse.json();

        const lineFeatures = lineData.features; // Assuming lineData is your GeoJSON data

        this.lineGeoJsonLayer = L.geoJSON(lineData, {
          style: {
            color: 'black', // Set line color
            weight: 2 // Set line weight
          },

          onEachFeature: (feature, layer) => {

            const currentIndex = lineFeatures.indexOf(feature); // Get the index of the current feature

            if (feature.properties) {
              const bearing = feature.properties.Bearing;
              const distance = feature.properties.Distance;

              // Check if either Bearing or Distance is available
              if (bearing !== null || distance !== null) {
                // Get the coordinates of the line
                let coordinates: number[][] = [];
                if (feature.geometry.type === 'MultiLineString') {
                  coordinates = feature.geometry.coordinates[0]; // For MultiLineString, choose the first line
                } else if (feature.geometry.type === 'LineString') {
                  coordinates = feature.geometry.coordinates;
                }

                const start = coordinates[0];
                const end = coordinates[1];

                // Calculate the angle between start and end points in radians
                let angle = Math.atan2(end[1] - start[1], end[0] - start[0]);

                // Ensure angle is positive
                if (angle < 0) {
                  angle += 2 * Math.PI;
                }

                // Calculate the center point of the line segment
                const center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

                let rotationAngle; // Declare rotationAngle variable here

                if (distance !== null) {
                  // Create a custom icon
                  const customIcon = L.icon({
                    iconUrl: 'assets/AKTIM_7A/penta.png',
                    iconSize: [44, 36],
                    iconAnchor: [20, 19]
                  });

                  // Calculate the rotation angle in degrees for the icon
                  let iconRotationAngle = parseFloat(bearing);

                  // If current bearing is null, use the next bearing value
                  if (isNaN(iconRotationAngle)) {
                    const nextIndex = currentIndex + 1;
                    if (nextIndex < lineFeatures.length) {
                      const nextFeature = lineFeatures[nextIndex];
                      if (nextFeature.properties && nextFeature.properties.Bearing) {
                        iconRotationAngle = parseFloat(nextFeature.properties.Bearing);
                      }
                    }
                  }

                  // Create a marker with a custom icon at the center point and rotation
                  const marker = L.marker(L.latLng(center[1], center[0]), {
                    icon: customIcon,
                    rotationAngle: iconRotationAngle // Set rotation angle based on line direction or bearing
                  }).addTo(this.airportLayerGroup);

                  // Calculate the rotation angle for the distance text relative to the line direction
                  if (iconRotationAngle !== null) {
                    if (iconRotationAngle >= 0 && iconRotationAngle < 180) {
                      // Angle between 0 and 180 degrees
                      rotationAngle = iconRotationAngle - 90;
                    } else {
                      // Angle between 180 and 360 degrees
                      rotationAngle = iconRotationAngle + 90;
                    }
                  } else {
                    // Default rotation angle if iconRotationAngle is null
                    rotationAngle = angle * (180 / Math.PI) - 90;
                  }

                  // Bind tooltip with distance text to the marker, rotate dynamically based on the line direction
                  const distanceTooltip = `<div style="transform: rotate(${rotationAngle}deg); font-size: 8px;">${feature.properties.Distance}</div>`;
                  marker.bindTooltip(distanceTooltip, {
                    permanent: true,
                    direction: 'center',
                    className: 'labelstyle',
                    opacity: 1
                  });
                }

                if (bearing !== null) {
                  // Add bearing text outside the icon
                  const bearingMarker = L.marker(L.latLng(center[1], center[0]), {
                    rotationAngle: rotationAngle, // Set rotation angle
                    icon: L.divIcon({
                      className: 'bearing-label', // Custom CSS class for styling
                      html: `<div style="font-size: 8px;">${feature.properties.Bearing}</div>`, // HTML content for the bearing text
                      iconAnchor: [10, 20] // Adjust the icon anchor to shift the bearing text above by 20 pixels
                    })
                  }).addTo(this.airportLayerGroup);
                }
              }

            }
          }
        });

        this.airportLayerGroup.addLayer(this.lineGeoJsonLayer);


      } catch (error) {
        console.error(`Error loading ${procedureName} SID procedure:`, error);
      }
    };

    // Mapping of procedure names to their respective file paths
    const proceduresMap: { [key: string]: [string, string, string] } = {
      //VOBL_RWY9L SID procedure
      'AKTIM 7A': ['assets/VOBL_RWY9L/SID/AKTIM7A/AKTIM7A_Point.geojson', 'assets/VOBL_RWY9L/SID/AKTIM7A/AKTIM7A_line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'ANIRO 7A': ['assets/VOBL_RWY9L/SID/ANIRO7A/ANIRO7A_Point.geojson', 'assets/VOBL_RWY9L/SID/ANIRO7A/ANIRO7A_line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'GUNIM 7A': ['assets/VOBL_RWY9L/SID/GUNIM7A/GUNIM7A_Point.geojson', 'assets/VOBL_RWY9L/SID/GUNIM7A/GUNIM7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'VAGPU 7A': ['assets/VOBL_RWY9L/SID/VAGPU7A/VAGPU7A_Point.geojson', 'assets/VOBL_RWY9L/SID/VAGPU7A/VAGPU7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'GUNIM 7L': ['assets/VOBL_RWY9L/SID/GUNIM7L/GUNIM7L_Point.geojson', 'assets/VOBL_RWY9L/SID/GUNIM7L/GUNIM7L_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'OPAMO 7A': ['assets/VOBL_RWY9L/SID/OPAMO7A/OPAMO7A_Point.geojson', 'assets/VOBL_RWY9L/SID/OPAMO7A/OPAMO7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'PEXEG 7A': ['assets/VOBL_RWY9L/SID/PEXEG7A/PEXEG7A_Point.geojson', 'assets/VOBL_RWY9L/SID/PEXEG7A/PEXEG7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'TULNA 7A': ['assets/VOBL_RWY9L/SID/TULNA7A/TULNA7A_Point.geojson', 'assets/VOBL_RWY9L/SID/TULNA7A/TULNA7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'VEMBO 7A': ['assets/VOBL_RWY9L/SID/VEMBO7A/VEMBO7A_Point.geojson', 'assets/VOBL_RWY9L/SID/VEMBO7A/VEMBO7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'LATID 7A': ['assets/VOBL_RWY9L/SID/LATID7A/LATID7A_Point.geojson', 'assets/VOBL_RWY9L/SID/LATID7A/LATID7A_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'SAI 7A': ['assets/VOBL_RWY9L/SID/SAI7A/SAI7A_Point.geojson', 'assets/VOBL_RWY9L/SID/SAI7A/SAI7A_Line.geojson', ''],
      //VOBL_RWY9L STAR procedure
      'GUNIM 7E': ['assets/VOBL_RWY9L/STAR/GUNIM7E/GUNIM7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/GUNIM7E/GUNIM7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'ADKAL 7E': ['assets/VOBL_RWY9L/STAR/ADKAL7E/ADKAL7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/ADKAL7E/ADKAL7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'LEKAP 7E': ['assets/VOBL_RWY9L/STAR/LEKAP7E/LEKAP7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/LEKAP7E/LEKAP7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'PEXEG 7E': ['assets/VOBL_RWY9L/STAR/PEXEG7E/PEXEG7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/PEXEG7E/PEXEG7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'RIKBU 7E': ['assets/VOBL_RWY9L/STAR/RIKBU7E/RIKBU7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/RIKBU7E/RIKBU7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'SUSIK 7E': ['assets/VOBL_RWY9L/STAR/SUSIK7E/SUSIK7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/SUSIK7E/SUSIK7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'SUSIK 7J': ['assets/VOBL_RWY9L/STAR/SUSIK7J/SUSIK7J_Point.geojson', 'assets/VOBL_RWY9L/STAR/SUSIK7J/SUSIK7J_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'TELUV 7E': ['assets/VOBL_RWY9L/STAR/TELUV7E/TELUV7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/TELUV7E/TELUV7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'UGABA 7E': ['assets/VOBL_RWY9L/STAR/UGABA7E/UGABA7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/UGABA7E/UGABA7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      'XIVIL 7E': ['assets/VOBL_RWY9L/STAR/XIVIL7E/XIVIL7E_Point.geojson', 'assets/VOBL_RWY9L/STAR/XIVIL7E/XIVIL7E_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      // VOBL_RWY9L APCH procedure
      'RNP': ['assets/VOBL_RWY9L/APCH/RNP/RNp_RWY_09L_Point.geojson', 'assets/VOBL_RWY9L/APCH/RNP/RNp_RWY_09L_Line.geojson', 'assets/RWY/VOBL_RWY09L.geojson'],
      // VOBL_RWY27R sid procedure
      'AKTIM 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/AKTIM7B/AKTIM7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/AKTIM7B/AKTIM7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'ANIRO 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/ANIRO7B/ANIRO7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/ANIRO7B/ANIRO7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'GUNIM 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/GUNIM7B/GUNIM7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/GUNIM7B/GUNIM7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'GUNIM 7J': ['assets/VOBL_RWY27R/SID27R_VOBL/GUNIM7J/GUNIM7J_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/GUNIM7J/GUNIM7J_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'OPAMO 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/OPAMO7B/OPAMO7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/OPAMO7B/OPAMO7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'SAI 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/SAI7B/SAI7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/SAI7B/SAI7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'PEXEG 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/PEXEG7B/PEXEG7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/PEXEG7B/PEXEG7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'TULNA 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/TULNA7B/TULNA7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/TULNA7B/TULNA7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'VEMBO 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/VEMBO7B/VEMBO7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/VEMBO7B/VEMBO7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'LATID 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/LATID7B/LATID7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/LATID7B/LATID72_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'VEMBO 7S': ['assets/VOBL_RWY27R/SID27R_VOBL/VEMBO7S/VEMBO7S_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/VEMBO7S/VEMBO7S_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'ANIRO 7S': ['assets/VOBL_RWY27R/SID27R_VOBL/ANIRO7S/ANIRO7S_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/ANIRO7S/ANIRO7S_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'VAGPU 7B': ['assets/VOBL_RWY27R/SID27R_VOBL/VAGPU7B/VAGPU7B_Point.geojson', 'assets/VOBL_RWY27R/SID27R_VOBL/VAGPU7B/VAGPU7B_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      //VOBL_RWY27R star procedure
      'ADKAL 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/ADKAL7F/ADKAL7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/ADKAL7F/ADKAL7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'GUNIM 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/GUNIM7F/GUNIM7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/GUNIM7F/GUNIM7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'GUNIM 7N': ['assets/VOBL_RWY27R/STAR27R_VOBL/GUNIM7N/GUNIM7N_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/GUNIM7N/GUNIM7N_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'LEKAP 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/LEKAP7F/LEKAP7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/LEKAP7F/LEKAP7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'PEXEG 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/PEXEG7F/PEXEG7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/PEXEG7F/PEXEG7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'PEXEG 7N': ['assets/VOBL_RWY27R/STAR27R_VOBL/PEXEG7N/PEXEG7N_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/PEXEG7N/PEXEG7N_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'RIKBU 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/RIKBU7F/RIKBU7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/RIKBU7F/RIKBU7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'SUSIK 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/SUSIK7F/SUSIK7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/SUSIK7F/SUSIK7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'SUSIK 7L': ['assets/VOBL_RWY27R/STAR27R_VOBL/SUSIK7L/SUSIK7L_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/SUSIK7L/SUSIK7L_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'TELUV 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/TELUV7F/TELUV7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/TELUV7F/TELUV7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'UGABA 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/UGABA7F/UGABA7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/UGABA7F/UGABA7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      'XIVIL 7F': ['assets/VOBL_RWY27R/STAR27R_VOBL/XIVIL7F/XIVIL7F_Point.geojson', 'assets/VOBL_RWY27R/STAR27R_VOBL/XIVIL7F/XIVIL7F_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      //VOBL_RWY27R APCh procedure
      'RNP_Y': ['assets/VOBL_RWY27R/APCH27R_VOBL/RNP_Y_RWY_27R_Point.geojson', 'assets/VOBL_RWY27R/APCH27R_VOBL/RNP_Y_RWY_27R_Line.geojson', 'assets/RWY/VOBL_RWY27R.geojson'],
      //VIJP_RWY09 sid procedures
      'UKASO 1D': ['assets/VIJP_RWY09/SID_RWY09/UKASO1D/UKASO1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/UKASO1D/UKASO1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'UXENI 1D': ['assets/VIJP_RWY09/SID_RWY09/UXENI1D/UXENI1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/UXENI1D/UXENI1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'GUDUM 1D': ['assets/VIJP_RWY09/SID_RWY09/GUDUM1D/GUDUM1D_1_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/GUDUM1D/GUDUM1D_1_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'NIKOT 1D': ['assets/VIJP_RWY09/SID_RWY09/NIKOT1D/NIKOT1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/NIKOT1D/NIKOT1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'IKAVA 1D': ['assets/VIJP_RWY09/SID_RWY09/IKAVA1D/IKAVA1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/IKAVA1D/IKAVA1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'INTIL 1D': ['assets/VIJP_RWY09/SID_RWY09/INTIL1D/INTIL1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/INTIL1D/INTIL1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'LOVGA 1D': ['assets/VIJP_RWY09/SID_RWY09/LOVGA1D/LOVGA1D_Point.geojson', 'assets/VIJP_RWY09/SID_RWY09/LOVGA1D/LOVGA1D_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      //VIJP_RWY09 Star procedures
      'IGOLU 1C': ['assets/VIJP_RWY09/STAR_RWO9/IGOLU1C/IGOLU1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/IGOLU1C/IGOLU1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'LOVGA 1C': ['assets/VIJP_RWY09/STAR_RWO9/LOVGA1C/LOVGA1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/LOVGA1C/LOVGA1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'BUBNU 1C': ['assets/VIJP_RWY09/STAR_RWO9/BUBNU1C/BUBNU1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/BUBNU1C/BUBNU1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'RIDRA 1C': ['assets/VIJP_RWY09/STAR_RWO9/RIDRA1C/RIDRA1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/RIDRA1C/RIDRA1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'INTIL 1C': ['assets/VIJP_RWY09/STAR_RWO9/INTILC/INTIL1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/INTILC/INTIL1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      'UXENI 1C': ['assets/VIJP_RWY09/STAR_RWO9/UXENI1C/UXENI1C_Point.geojson', 'assets/VIJP_RWY09/STAR_RWO9/UXENI1C/UXENI1C_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      //VIJP_RWY09 APCH procedures
      'RNP_Y_RWY_09': ['assets/VIJP_RWY09/APCH_RW09/RNP_Y_RWY_09_Point.geojson', 'assets/VIJP_RWY09/APCH_RW09/RNP_Y_RWY_09_Line.geojson', 'assets/RWY/VIJP_RWY09.geojson'],
      //VIJP_RWY27 SID procedures
      'GUDUM 1B': ['assets/VIJP_RWY27/SID_RWY27/GUDUM1B/GUDUM1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/GUDUM1B/GUDUM1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'UXENI 1B': ['assets/VIJP_RWY27/SID_RWY27/UXENI1B/UXENI1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/UXENI1B/UXENI1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'IKAVA 1B': ['assets/VIJP_RWY27/SID_RWY27/IKAVA1B/IKAVA1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/IKAVA1B/IKAVA1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'INTIL 1B': ['assets/VIJP_RWY27/SID_RWY27/INTIL1B/INTIL1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/INTIL1B/INTIL1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'UKASO 1B': ['assets/VIJP_RWY27/SID_RWY27/UKASO1B/UKASO1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/UKASO1B/UKASO1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'LOVGA 1B': ['assets/VIJP_RWY27/SID_RWY27/LOVGA1B/LOVGA1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/LOVGA1B/LOVGA1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'NIKOT 1B': ['assets/VIJP_RWY27/SID_RWY27/NIKOT1B/NIKOT1B_Point.geojson', 'assets/VIJP_RWY27/SID_RWY27/NIKOT1B/NIKOT1B_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],

      //VIJP_RWY27 STAR procedures
      'IGOLU 1A': ['assets/VIJP_RWY27/STAR_RWY27/IGOLU1A/IGOLU1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/IGOLU1A/IGOLU1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'LOVGA 1A': ['assets/VIJP_RWY27/STAR_RWY27/LOVGA1A/LOVGA1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/LOVGA1A/LOVGA1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'INTIL 1A': ['assets/VIJP_RWY27/STAR_RWY27/INTIL1A/INTIL1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/INTIL1A/INTIL1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'RIDRA 1A': ['assets/VIJP_RWY27/STAR_RWY27/RIDRA1A/RIDRA1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/RIDRA1A/RIDRA1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'BUBNU 1A': ['assets/VIJP_RWY27/STAR_RWY27/BUBNU1A/BUBNU1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/BUBNU1A/BUBNU1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      'UXENI 1A': ['assets/VIJP_RWY27/STAR_RWY27/UXENI1A/UXENI1A_Point.geojson', 'assets/VIJP_RWY27/STAR_RWY27/UXENI1A/UXENI1A_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      //VIJP_RWY27 APCH procedures
      'RNP_Y_RWY27': ['assets/VIJP_RWY27/APCH_RW27/RNP_Y_RWY27_Point.geojson', 'assets/VIJP_RWY27/APCH_RW27/RNP_Y_RWY27_Line.geojson', 'assets/RWY/VIJP_RWY27.geojson'],
      //VEPY_RWY02 APCH procedures
      'RNP_Y_RWY02': ['assets/VEPY/APCH_RWY02/RNP_Y_RWY02_Point.geojson', 'assets/VEPY/APCH_RWY02/RNP_Y_RWY02_Line.geojson', 'assets/RWY/VEPY_RWY02.geojson'],
      //VEPY_RWY20 SID procedures
      'BGD1': ['assets/VEPY/SID_RWY20/BGD1_Departure/BGD1_Point.geojson', 'assets/VEPY/SID_RWY20/BGD1_Departure/BGD1_Line.geojson', 'assets/RWY/VEPY_RWY20.geojson'],
      //VOBL_RWY09R SID procedures
      'AKTIM 7C': ['assets/VOBL_RWY09R/AKTIM7C/AKTIM7C_Point.geojson', 'assets/VOBL_RWY09R/AKTIM7C/AKTIM7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'ANIRO 7C': ['assets/VOBL_RWY09R/ANIRO7C/ANIRO7C_Point.geojson', 'assets/VOBL_RWY09R/ANIRO7C/ANIRO7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'GUNIM 7C': ['assets/VOBL_RWY09R/GUNIM7C/GUNIM7C_Point.geojson', 'assets/VOBL_RWY09R/GUNIM7C/GUNIM7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'GUNIM 7M': ['assets/VOBL_RWY09R/GUNIM7M/GUNIM7M_Point.geojson', 'assets/VOBL_RWY09R/GUNIM7M/GUNIM7M_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'LATID 7C': ['assets/VOBL_RWY09R/LATID7C/LATID7C_Point.geojson', 'assets/VOBL_RWY09R/LATID7C/LATID7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'OPAMO 7C': ['assets/VOBL_RWY09R/OPAMO7C/OPAMO7C_Point.geojson', 'assets/VOBL_RWY09R/OPAMO7C/OPAMO7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'PEXEG 7C': ['assets/VOBL_RWY09R/PEXEG7C/PEXEG7C_Point.geojson', 'assets/VOBL_RWY09R/PEXEG7C/PEXEG7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'SAI 7C': ['assets/VOBL_RWY09R/SAI7C/SAI7C_Point.geojson', 'assets/VOBL_RWY09R/SAI7C/SAI7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'TULNA 7C': ['assets/VOBL_RWY09R/TULNA7C/TULNA7C_Point.geojson', 'assets/VOBL_RWY09R/TULNA7C/TULNA7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'VAGPU 7C': ['assets/VOBL_RWY09R/VAGPU7C/VAGPU7C_Point.geojson', 'assets/VOBL_RWY09R/VAGPU7C/VAGPU7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      'VEMBO 7C': ['assets/VOBL_RWY09R/VEMBO7C/VEMBO7C_Point.geojson', 'assets/VOBL_RWY09R/VEMBO7C/VEMBO7C_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      //VOBL_RWY09R APCH procedures
      'RNP_Y_RWY09R': ['assets/VOBL_RWY09R/VOBL_APCH09R/RNP_Y_RWY09R_Point.geojson', 'assets/VOBL_RWY09R/VOBL_APCH09R/RNP_Y_RWY09R_Line.geojson', 'assets/RWY/VOBL_RWY09R.geojson'],
      //VOBL_RWY27L SID procedures
      'AKTIM 7D': ['assets/VOBL_RW27L/AKTIM7D/AKTIM7D_Point.geojson', 'assets/VOBL_RW27L/AKTIM7D/AKTIM7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'ANIRO 7D': ['assets/VOBL_RW27L/ANIRO7D/ANIRO7D_Point.geojson', 'assets/VOBL_RW27L/ANIRO7D/ANIRO7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'GUNIM 7D': ['assets/VOBL_RW27L/GUNIM7D/GUNIM7D_Point.geojson', 'assets/VOBL_RW27L/GUNIM7D/GUNIM7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'GUNIM 7U': ['assets/VOBL_RW27L/GUNIM7U/GUNIM7U_Point.geojson', 'assets/VOBL_RW27L/GUNIM7U/GUNIM7U_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'LATID 7D': ['assets/VOBL_RW27L/LATID7D/LATID7D_Point.geojson', 'assets/VOBL_RW27L/LATID7D/LATID7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'OPAMO 7D': ['assets/VOBL_RW27L/OPAMO7D/OPAMO7D_Point.geojson', 'assets/VOBL_RW27L/OPAMO7D/OPAMO7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'PEXEG 7D': ['assets/VOBL_RW27L/PEXEG7D/PEXEG7D_Point.geojson', 'assets/VOBL_RW27L/PEXEG7D/PEXEG7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'SAI 7D': ['assets/VOBL_RW27L/SAI7D/SAI7D_Point.geojson', 'assets/VOBL_RW27L/SAI7D/SAI7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'TULNA 7D': ['assets/VOBL_RW27L/TULNA7D/TULNA7D_Point.geojson', 'assets/VOBL_RW27L/TULNA7D/TULNA7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'VAGPU 7D': ['assets/VOBL_RW27L/VAGPU7D/VAGPU7D_Point.geojson', 'assets/VOBL_RW27L/VAGPU7D/VAGPU7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'VEMBO 7D': ['assets/VOBL_RW27L/VEMBO7D/VEMBO7D_Point.geojson', 'assets/VOBL_RW27L/VEMBO7D/VEMBO7D_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'VEMBO 7Y': ['assets/VOBL_RW27L/VEMBO7Y/VEMBO7Y_Point.geojson', 'assets/VOBL_RW27L/VEMBO7Y/VEMBO7Y_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      'ANIRO 7Y': ['assets/VOBL_RW27L/ANIRO7Y/ANIRO7Y_Point.geojson', 'assets/VOBL_RW27L/ANIRO7Y/ANIRO7Y_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
      //VOBL_RWY27L APCH procedures
      'RNP_Y_RWY27L': ['assets/VOBL_RW27L/VOBL_APCH27L/RNP_Y_RWY27L_Point.geojson', 'assets/VOBL_RW27L/VOBL_APCH27L/RNP_Y_RWY27L_Line.geojson', 'assets/RWY/VOBL_RWY27L.geojson'],
    };
    // Iterate over selected procedures and load them
    for (const procedureName in proceduresMap) {
      if (this.selectedProcedureName.includes(procedureName)) {
        const [pointFileName, lineFileName, iconFileName] = proceduresMap[procedureName];
        loadSIDProcedure(procedureName, pointFileName, lineFileName, iconFileName);
      }
    }
  }

  getLiveLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Add marker for live location
        const marker = L.marker([latitude, longitude]).addTo(this.map);
        marker.bindPopup('Your Live Location').openPopup();

        // Pan the map to the live location
        this.map.panTo([latitude, longitude]);
      }, (error) => {
        console.error('Error getting live location:', error);
      });
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  watchAirportChanges(): void {
    this.Airform.get('selectedAirport')?.valueChanges.subscribe((selectedAirport: string[]) => {
      // Clear all runway and procedure options when the selected airport changes
      this.optionsBengaluruKIARunway = [];
      this.optionsVIJPJAIPURRunway = [];
      this.optionsVEPYPAKYONGRunway = [];
      this.optionsRWY_09LTypeofProcedure = [];
      this.selectedTypeofProcedure = [];


      const customIcon = L.icon({
        iconUrl: 'assets/airport.png',
        iconSize: [30, 30],
        iconAnchor: [10, 30]
      });



      // Check if VOBL/Bengaluru (KIA) is selected
      if (selectedAirport.includes('VOBL/Bengaluru (KIA)')) {

        this.airportLayerGroup.clearLayers(); // Remove all markers when no airport is selected

        const marker = L.marker([13.198889, 77.705556], { icon: customIcon }).addTo(this.airportLayerGroup);


        // Set the map view to the marker's position
        this.map.setView([13.1979, 77.7063], 13);


        this.optionsBengaluruKIARunway = [
          { value: 'RWY 09L', label: 'RWY 09L' },
          { value: 'RWY_9R', label: 'RWY 09R' },
          { value: '27L_RWY', label: 'RWY 27L' },
          { value: 'RWY 27R', label: 'RWY 27R' },
        ];
        // Set view to Bengaluru
        this.map.setView([13.206944, 77.704167], 12);
      } else {
        this.optionsBengaluruKIARunway = [];
      }

      // Check if VIJP/JAIPUR is selected
      if (selectedAirport.includes('VIJP/JAIPUR')) {
        const marker = L.marker([26.824167, 75.8025], { icon: customIcon }).addTo(this.airportLayerGroup);


        // Set the map view to the marker's position
        this.map.setView([23.071111, 72.626389], 13);


        // Show options for VIJP/JAIPUR
        this.optionsVIJPJAIPURRunway = [
          { value: 'RWY_09', label: 'RWY_08' },
          { value: 'RWY_27', label: 'RWY_26' },
        ];
        // Set view to Jaipur
        this.map.setView([26.824167, 75.812222], 12);
      } else {
        this.optionsVIJPJAIPURRunway = [];
      }
      // Check if VEPY/PAKYONG is selected
      if (selectedAirport.includes('VEPY/PAKYONG')) {
        const marker = L.marker([27.225833, 88.585833], { icon: customIcon }).addTo(this.airportLayerGroup);

        // Set the map view to the marker's position
        this.map.setView([27.1333, 88.3509], 13);
        // Show options for VEPY/PAKYONG
        this.optionsVEPYPAKYONGRunway = [
          { value: 'RWY 02', label: 'RWY 02' },
          { value: 'RWY 20', label: 'RWY 20' },
        ];
        // Set view to Pakyong
        this.map.setView([27.2394, 88.5961], 12);
      } else {
        this.optionsVEPYPAKYONGRunway = [];
      }
    });

    this.Airform.get('selectedRunway')?.valueChanges.subscribe((selectedRunway: string[]) => {
      // Reset options for both runways
      this.selectedTypeofProcedure = [];
      this.optionsRWY_09LTypeofProcedure = [];

      // Check if RWY 09L or RWY 27R is selected
      if (selectedRunway.includes('RWY 09L') || selectedRunway.includes('RWY 27R') ||
        selectedRunway.includes('RWY_09') || selectedRunway.includes('RWY 02') ||
        selectedRunway.includes('RWY 20') || selectedRunway.includes('RWY_27') ||
        selectedRunway.includes('RWY_9R') || selectedRunway.includes('27L_RWY')) {

        this.optionsRWY_09LTypeofProcedure = [
          { value: 'SID', label: 'SID' },
          { value: 'STAR', label: 'STAR' },
          { value: 'APCH', label: 'APCH' },
        ];
      }
    });

    this.Airform.get('selectedTypeofProcedure')?.valueChanges.subscribe((selectedTypeofProcedure: string[]) => {

      let filteredOptions: { value: string, label: string }[] = [];

      if (this.Airform.get('selectedRunway')?.value.includes('RWY 09L')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'AKTIM 7A', label: 'AKTIM 7A' },
            { value: 'ANIRO 7A', label: 'ANIRO 7A' },
            { value: 'GUNIM 7A', label: 'GUNIM 7A' },
            { value: 'VAGPU 7A', label: 'VAGPU 7A' },
            { value: 'GUNIM 7L', label: 'GUNIM 7L' },
            { value: 'OPAMO 7A', label: 'OPAMO 7A' },
            { value: 'PEXEG 7A', label: 'PEXEG 7A' },
            { value: 'TULNA 7A', label: 'TULNA 7A' },
            { value: 'VEMBO 7A', label: 'VEMBO 7A' },
            { value: 'LATID 7A', label: 'LATID 7A' },
            { value: 'SAI 7A', label: 'SAI 7A' },
          ]);
        }
        if (selectedTypeofProcedure.includes('STAR')) {
          filteredOptions = filteredOptions.concat([
            { value: 'ADKAL 7E', label: 'ADKAL 7E' },
            { value: 'GUNIM 7E', label: 'GUNIM 7E' },
            { value: 'LEKAP 7E', label: 'LEKAP 7E' },
            { value: 'PEXEG 7E', label: 'PEXEG 7E' },
            { value: 'RIKBU 7E', label: 'RIKBU 7E' },
            { value: 'SUSIK 7E', label: 'SUSIK 7E' },
            { value: 'SUSIK 7J', label: 'SUSIK 7J' },
            { value: 'TELUV 7E', label: 'TELUV 7E' },
            { value: 'UGABA 7E', label: 'UGABA 7E' },
            { value: 'XIVIL 7E', label: 'XIVIL 7E' },
          ]);
        }
        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP', label: 'RNP_RWY_09L' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
      if (this.Airform.get('selectedRunway')?.value.includes('RWY 27R')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'AKTIM 7B', label: 'AKTIM 7B' },
            { value: 'ANIRO 7B', label: 'ANIRO 7B' },
            { value: 'GUNIM 7B', label: 'GUNIM 7B' },
            { value: 'GUNIM 7J', label: 'GUNIM 7J' },
            { value: 'OPAMO 7B', label: 'OPAMO 7B' },
            { value: 'SAI 7B', label: 'SAI 7B' },
            { value: 'PEXEG 7B', label: 'PEXEG 7B' },
            { value: 'TULNA 7B', label: 'TULNA 7B' },
            { value: 'VEMBO 7B', label: 'VEMBO 7B' },
            { value: 'LATID 7B', label: 'LATID 7B' },
            { value: 'VEMBO 7S', label: 'VEMBO 7S' },
            { value: 'ANIRO 7S', label: 'ANIRO 7S' },
            { value: 'VAGPU 7B', label: 'VAGPU 7B' },
          ]);
        }
        if (selectedTypeofProcedure.includes('STAR')) {
          filteredOptions = filteredOptions.concat([
            { value: 'ADKAL 7F', label: 'ADKAL 7F' },
            { value: 'GUNIM 7F', label: 'GUNIM 7F' },
            { value: 'GUNIM 7N', label: 'GUNIM 7N' },
            { value: 'LEKAP 7F', label: 'LEKAP 7F' },
            { value: 'PEXEG 7F', label: 'PEXEG 7F' },
            { value: 'PEXEG 7N', label: 'PEXEG 7N' },
            { value: 'RIKBU 7F', label: 'RIKBU 7F' },
            { value: 'SUSIK 7F', label: 'SUSIK 7F' },
            { value: 'SUSIK 7L', label: 'SUSIK 7L' },
            { value: 'TELUV 7F', label: 'TELUV 7F' },
            { value: 'UGABA 7F', label: 'UGABA 7F' },
            { value: 'XIVIL 7F', label: 'XIVIL 7F' },
          ]);
        }
        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y', label: 'RNP_Y_RWY_27R' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
      if (this.Airform.get('selectedRunway')?.value.includes('RWY_09')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'UKASO 1D', label: 'UKASO 1D' },
            { value: 'UXENI 1D', label: 'UXENI 1D' },
            { value: 'GUDUM 1D', label: 'GUDUM 1D' },
            { value: 'NIKOT 1D', label: 'NIKOT 1D' },
            { value: 'IKAVA 1D', label: 'IKAVA 1D' },
            { value: 'INTIL 1D', label: 'INTIL 1D' },
            { value: 'LOVGA 1D', label: 'LOVGA 1D' },
          ]);
        }
        if (selectedTypeofProcedure.includes('STAR')) {
          filteredOptions = filteredOptions.concat([
            { value: 'IGOLU 1C', label: 'IGOLU 1C' },
            { value: 'LOVGA 1C', label: 'LOVGA 1C' },
            { value: 'BUBNU 1C', label: 'BUBNU 1C' },
            { value: 'RIDRA 1C', label: 'RIDRA 1C' },
            { value: 'INTIL 1C', label: 'INTIL 1C' },
            { value: 'UXENI 1C', label: 'UXENI 1C' },
          ]);
        }
        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y_RWY_09', label: 'RNP_Y_RWY_09' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
      if (this.Airform.get('selectedRunway')?.value.includes('RWY_27')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'UXENI 1B', label: 'UXENI 1B' },
            { value: 'IKAVA 1B', label: 'IKAVA 1B' },
            { value: 'INTIL 1B', label: 'INTIL 1B' },
            { value: 'UKASO 1B', label: 'UKASO 1B' },
            { value: 'LOVGA 1B', label: 'LOVGA 1B' },
            { value: 'GUDUM 1B', label: 'GUDUM 1B' },
            { value: 'NIKOT 1B', label: 'NIKOT 1B' },
          ]);
        }
        if (selectedTypeofProcedure.includes('STAR')) {
          filteredOptions = filteredOptions.concat([
            { value: 'IGOLU 1A', label: 'IGOLU 1A' },
            { value: 'LOVGA 1A', label: 'LOVGA 1A' },
            { value: 'INTIL 1A', label: 'INTIL 1A' },
            { value: 'RIDRA 1A', label: 'RIDRA 1A' },
            { value: 'BUBNU 1A', label: 'BUBNU 1A' },
            { value: 'UXENI 1A', label: 'UXENI 1A' },
          ]);
        }
        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y_RWY27', label: 'RNP_Y_RWY27' },

          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
      if (this.Airform.get('selectedRunway')?.value.includes('RWY 20')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'BGD1', label: 'BGD1' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
      if (this.Airform.get('selectedRunway')?.value.includes('RWY 02')) {

        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y_RWY02', label: 'RNP_Y_RWY02' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }

      if (this.Airform.get('selectedRunway')?.value.includes('RWY_9R')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'AKTIM 7C', label: 'AKTIM 7C' },
            { value: 'ANIRO 7C', label: 'ANIRO 7C' },
            { value: 'GUNIM 7C', label: 'GUNIM 7C' },
            { value: 'GUNIM 7M', label: 'GUNIM 7M' },
            { value: 'LATID 7C', label: 'LATID 7C' },
            { value: 'OPAMO 7C', label: 'OPAMO 7C' },
            { value: 'PEXEG 7C', label: 'PEXEG 7C' },
            { value: 'SAI 7C', label: 'SAI 7C' },
            { value: 'TULNA 7C', label: 'TULNA 7C' },
            { value: 'VAGPU 7C', label: 'VAGPU 7C' },
            { value: 'VEMBO 7C', label: 'VEMBO 7C' },
          ]);
        }

        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y_RWY09R', label: 'RNP_Y_RWY09R' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }

      if (this.Airform.get('selectedRunway')?.value.includes('27L_RWY')) {
        if (selectedTypeofProcedure.includes('SID')) {

          filteredOptions = filteredOptions.concat([
            { value: 'AKTIM 7D', label: 'AKTIM 7D' },
            { value: 'ANIRO 7D', label: 'ANIRO 7D' },
            { value: 'GUNIM 7D', label: 'GUNIM 7D' },
            { value: 'GUNIM 7U', label: 'GUNIM 7U' },
            { value: 'LATID 7D', label: 'LATID 7D' },
            { value: 'OPAMO 7D', label: 'OPAMO 7D' },
            { value: 'PEXEG 7D', label: 'PEXEG 7D' },
            { value: 'SAI 7D', label: 'SAI 7D' },
            { value: 'TULNA 7D', label: 'TULNA 7D' },
            { value: 'VAGPU 7D', label: 'VAGPU 7D' },
            { value: 'VEMBO 7D', label: 'VEMBO 7D' },
            { value: 'VEMBO 7Y', label: 'VEMBO 7Y' },
            { value: 'ANIRO 7Y', label: 'ANIRO 7Y' },
          ]);
        }

        if (selectedTypeofProcedure.includes('APCH')) {
          filteredOptions = filteredOptions.concat([
            { value: 'RNP_Y_RWY27L', label: 'RNP_Y_RWY27L' },
          ]);
        }
        this.optionsProcedureName = filteredOptions;
      }
    });
  }

  loadFIR() {
    if (!this.firLayer) {
      // Add India FIR GeoJSON data
      fetch('assets/India_FIR.geojson')
        .then(response => response.json())
        .then(data => {
          this.airportLayerGroup.clearLayers();

          this.firLayer = L.geoJSON(data).addTo(this.map);
        });
    } else {
      if (this.map.hasLayer(this.firLayer)) {
        this.map.removeLayer(this.firLayer);
      } else {
        this.firLayer.addTo(this.map);

      }
    }
  }

  // loadwaypoint() {
  //   const wmsurl = 'http://localhost:8080/geoserver/wms';
  //   if (!this.geoServerLayer) {
  //     this.geoServerLayer = L.tileLayer.wms(
  //       wmsurl, {
  //       layers: 'waypoint',
  //       format: 'image/png',
  //       transparent: true,

  //     });
  //     this.airportLayerGroup.clearLayers();
  //     this.geoServerLayer.addTo(this.map);

  //     this.map.on("click", (e) => {

  //       const url = `${wmsurl}?
  //       request=GetFeatureInfo
  //       &service=WMS
  //       &version=1.1.1
  //       &layers=waypoint
  //       &styles=
  //       &srs=EPSG%3A4326
  //       &format=image%2Fpng
  //       &bbox=-${this.map.getBounds().toBBoxString()}
  //       &width=${this.map.getSize().x}
  //       &height=${this.map.getSize().y}
  //       &query_layers=waypoint
  //       &info_format=text%2Fhtml
  //       &feature_count=50
  //       &x=${this.map.latLngToContainerPoint(e.latlng).x}
  //       &y=${this.map.latLngToContainerPoint(e.latlng).y}
  //       &exceptions=application%2Fvnd.ogc.se_xml`
  //       console.log(url)
  //     })
  //   } else {
  //     if (this.map.hasLayer(this.geoServerLayer)) {
  //       this.map.removeLayer(this.geoServerLayer);
  //     } else {
  //       this.geoServerLayer.addTo(this.map);
  //     }
  //   }
  // }

  // loadwaypoint() {
  //   const wmsUrl = 'http://localhost:8080/geoserver/wms';
  //   const layerName = 'waypoint'; // Check if this is the correct layer name

  //   if (!this.geoServerLayer) {
  //     this.geoServerLayer = L.tileLayer.wms(
  //       wmsUrl,
  //       {
  //         layers: layerName,
  //         format: 'image/png',
  //         transparent: true,
  //       }
  //     );
  //     this.airportLayerGroup.clearLayers();
  //     this.geoServerLayer.addTo(this.map);

  //     this.map.on("click", (e) => {
  //       const latlng = e.latlng;
  //       const containerPoint = this.map.latLngToContainerPoint(latlng);
  //       const size = this.map.getSize();
  //       const bbox = this.map.getBounds().toBBoxString();

  //       const url = `${wmsUrl}?service=WMS&version=1.1.1&request=GetFeatureInfo&layers=${layerName}&styles=&srs=EPSG%3A4326&format=image%2Fpng&bbox=${bbox}&width=${size.x}&height=${size.y}&query_layers=${layerName}&info_format=text%2Fhtml&feature_count=50&x=${containerPoint.x}&y=${containerPoint.y}&exceptions=application%2Fvnd.ogc.se_xml`;

  //       console.log(url);
  //       // You can perform further actions with the URL, like making an AJAX request to fetch feature info
  //     });
  //   } else {
  //     if (this.map.hasLayer(this.geoServerLayer)) {
  //       this.map.removeLayer(this.geoServerLayer);
  //     } else {
  //       this.geoServerLayer.addTo(this.map);
  //     }
  //   }
  // }

  loadwaypoint() {
    const wmsUrl = 'http://localhost:8080/geoserver/wms';
    const layerName = 'waypoint';
    if (!this.geoServerLayer) {
      this.geoServerLayer = L.tileLayer.wms(
        wmsUrl,
        {
          layers: layerName,
          format: 'image/png',
          transparent: true,
        }
      );
      this.airportLayerGroup.clearLayers();
      this.geoServerLayer.addTo(this.map);


      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const latlng = e.latlng;
        const containerPoint = this.map.latLngToContainerPoint(latlng);
        const size = this.map.getSize();
        const bbox = this.map.getBounds().toBBoxString();

        const params = new URLSearchParams({
          service: 'WMS',
          version: '1.1.1',
          request: 'GetFeatureInfo',
          layers: layerName,
          styles: '',
          srs: 'EPSG:4326',
          format: 'image%2Fpng',
          bbox: bbox,
          width: size.x.toString(),
          height: size.y.toString(),
          query_layers: layerName,
          info_format: 'application/json',
          feature_count: '50',
          x: containerPoint.x.toString(),
          y: containerPoint.y.toString(),
          exceptions: 'application/vnd.ogc.se_xml'
        });

        const url = `${wmsUrl}?${params.toString()}`;

        console.log(url);

        fetch(url)
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.text();
          })
          .then(data => this.showGetFeatureInfo(data, latlng))
          .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
          });
      });
    } else {
      if (this.map.hasLayer(this.geoServerLayer)) {
        this.map.removeLayer(this.geoServerLayer);
      } else {
        this.geoServerLayer.addTo(this.map);
      }
    }
  }


  private showGetFeatureInfo(data: string, latlng: L.LatLng): void {
    console.log(data)
    L.popup()
      .setLatLng(latlng)
      .setContent(data)
      .openOn(this.map);
  }
  changeLineColor(color: string) {
    this.lineGeoJsonLayer.setStyle({ color });
    this.airportLayerGroup.setStyle({ color });
  }
}