import { Component, OnInit, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription, forkJoin, of, firstValueFrom } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { MqttService } from '../../shared/services/mqtt.service';
import { AirQualityService } from '../../shared/services/air-quality.service';
import { WeatherService } from '../../shared/services/weather.service';

declare var google: any;

interface ZoneData {
  id: string;
  name: string;
  type: 'port' | 'chimique' | 'cheminee' | 'usine' | 'dsi' | 'industrielle';
  coordinates: { lat: number; lng: number };
  description: string;
  weather?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    pressure: number;
    visibility: number;
    condition: string;
  };
  airQuality?: {
    aqi: number;
    pm25: number;
    pm10: number;
    no2: number;
    so2: number;
    co: number;
    o3: number;
    status: string;
  };
  lastUpdate?: Date;
  alerts?: string[];
}

@Component({
  selector: 'app-ocp-zone',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ocp-zone.component.html',
  styleUrls: ['./ocp-zone.component.css']
})
export class OcpZoneComponent implements OnInit, AfterViewInit, OnDestroy {
  zones: ZoneData[] = [
    {
      id: '1',
      name: 'Port de Jorf Lasfar',
      type: 'port',
      coordinates: { lat: 33.0894, lng: -8.6347 },
      description: 'Zone portuaire principale'
    },
    {
      id: '2',
      name: 'Complexe Chimique Nord',
      type: 'chimique',
      coordinates: { lat: 33.0956, lng: -8.6289 },
      description: 'Unité de production d\'acide phosphorique'
    },
    {
      id: '3',
      name: 'Complexe Chimique Sud',
      type: 'chimique',
      coordinates: { lat: 33.0823, lng: -8.6278 },
      description: 'Unité de production d\'engrais'
    },
    {
      id: '4',
      name: 'Cheminée Principale A',
      type: 'cheminee',
      coordinates: { lat: 33.0901, lng: -8.6312 },
      description: 'Cheminée de l\'unité de production principale'
    },
    {
      id: '5',
      name: 'Cheminée Principale B',
      type: 'cheminee',
      coordinates: { lat: 33.0889, lng: -8.6298 },
      description: 'Cheminée de l\'unité de traitement'
    },
    {
      id: '6',
      name: 'Usine de Traitement A',
      type: 'usine',
      coordinates: { lat: 33.0912, lng: -8.6334 },
      description: 'Usine de traitement des phosphates'
    },
    {
      id: '7',
      name: 'Usine de Traitement B',
      type: 'usine',
      coordinates: { lat: 33.0867, lng: -8.6256 },
      description: 'Usine de conditionnement'
    },
    {
      id: '8',
      name: 'Zone de Stockage',
      type: 'industrielle',
      coordinates: { lat: 33.0845, lng: -8.6389 },
      description: 'Zone de stockage des matières premières'
    },
    {
      id: '9',
      name: 'Centre Administratif',
      type: 'dsi',
      coordinates: { lat: 33.0934, lng: -8.6367 },
      description: 'Bâtiments administratifs et contrôle'
    },
    {
      id: '10',
      name: 'Laboratoire de Contrôle',
      type: 'dsi',
      coordinates: { lat: 33.0923, lng: -8.6301 },
      description: 'Laboratoire d\'analyse et contrôle qualité'
    }
  ];

  selectedZone: ZoneData | null = null;
  isLoading = false;
  mapLoading = true;
  error: string | null = null;
  autoRefresh = true;
  refreshInterval = 5; // minutes
  
  private map: any;
  private markers: Map<string, any> = new Map();
  private subscription?: Subscription;
  private mqttSubscription?: Subscription;
  private mapInitialized = false;

  constructor(
    private mqttService: MqttService,
    private airQualityService: AirQualityService,
    private weatherService: WeatherService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.initializeMqttConnection();
    this.loadAllZonesData();
    this.startAutoRefresh();
  }

  ngAfterViewInit() {
    this.initGoogleMap();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private initGoogleMap() {
    if (this.mapInitialized) return;

    const mapElement = document.getElementById('map');
    if (!mapElement) {
      setTimeout(() => this.initGoogleMap(), 500);
      return;
    }

    if (typeof google === 'undefined') {
      console.warn('Google Maps API not loaded, retrying...');
      setTimeout(() => this.initGoogleMap(), 500);
      return;
    }

    try {
      this.map = new google.maps.Map(mapElement, {
        zoom: 15,
        center: { lat: 33.0894, lng: -8.6347 },
        mapTypeId: 'satellite',
        gestureHandling: 'cooperative',
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_RIGHT
        },
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER
        }
      });

      this.mapInitialized = true;
      this.mapLoading = false;
      this.addZoneMarkers();
    } catch (err) {
      console.error('Google Maps initialization error:', err);
      this.mapLoading = false;
      this.error = 'Erreur de chargement de la carte Google Maps';
    }
  }

  private addZoneMarkers() {
    if (!this.map) return;

    this.markers.forEach(marker => marker.setMap(null));
    this.markers.clear();

    this.zones.forEach(zone => {
      const marker = new google.maps.Marker({
        position: zone.coordinates,
        map: this.map,
        title: zone.name,
        icon: this.getMarkerIcon(zone.type),
        optimized: true
      });

      const infoWindow = new google.maps.InfoWindow({
        content: this.createInfoWindowContent(zone),
        maxWidth: 300
      });

      marker.addListener('click', () => {
        this.ngZone.run(() => {
          this.selectZone(zone);
          infoWindow.open(this.map, marker);
        });
      });

      this.markers.set(zone.id, marker);
    });
  }

  createInfoWindowContent(zone: ZoneData): string {
    // Simple fallback, since the map is now in index.html, this is not used anymore
    return `<div><strong>${zone.name}</strong></div>`;
  }

  getMarkerIcon(type: string): string {
    const icons = {
      'port': 'assets/images/port.png',
      'chimique': 'assets/images/chemical.png',
      'cheminee': 'assets/images/smoke.png',
      'usine': 'assets/images/factory.png',
      'dsi': 'assets/images/control.png',
      'industrielle': 'assets/images/industry.png'
    };
    return icons[type as keyof typeof icons] || 'assets/images/marker.png';
  }

  getZoneTypeLabel(type: string): string {
    const labels = {
      'port': 'Zone Portuaire',
      'chimique': 'Zone Chimique',
      'cheminee': 'Cheminée',
      'usine': 'Usine',
      'dsi': 'Centre de Contrôle',
      'industrielle': 'Zone Industrielle'
    };
    return labels[type as keyof typeof labels] || type;
  }

  getZoneTypeColor(type: string): string {
    switch (type) {
      case 'port': return 'bg-blue-500';
      case 'chimique': return 'bg-red-500';
      case 'cheminee': return 'bg-yellow-600';
      case 'usine': return 'bg-gray-700';
      case 'dsi': return 'bg-green-600';
      case 'industrielle': return 'bg-purple-600';
      default: return 'bg-gray-400';
    }
  }

  getAirQualityColor(status: string): string {
    switch (status) {
      case 'Bon': return 'text-green-600';
      case 'Modéré': return 'text-yellow-600';
      case 'Mauvais': return 'text-orange-600';
      case 'Très mauvais': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  private transformWeatherData(data: any): ZoneData['weather'] {
    if (!data || !data.current) {
      return {
        temperature: 0,
        humidity: 0,
        windSpeed: 0,
        windDirection: 'N/A',
        pressure: 0,
        visibility: 0,
        condition: 'Indisponible'
      };
    }
    return {
      temperature: data.current.temp || 0,
      humidity: data.current.humidity || 0,
      windSpeed: data.wind?.speed || 0,
      windDirection: data.wind?.direction || 'N/A',
      pressure: data.current.pressure || 0,
      visibility: data.current.visibility || 0,
      condition: data.current.condition || 'N/A'
    };
  }

  private transformAirQualityData(data: any): ZoneData['airQuality'] {
    if (!data) {
      return {
        aqi: 0,
        pm25: 0,
        pm10: 0,
        no2: 0,
        so2: 0,
        co: 0,
        o3: 0,
        status: 'Bon'
      };
    }
    const aqi = data?.aqi || 0;
    return {
      aqi,
      pm25: data?.pm25 || 0,
      pm10: data?.pm10 || 0,
      no2: data?.no2 || 0,
      so2: data?.so2 || 0,
      co: data?.co || 0,
      o3: data?.o3 || 0,
      status: this.getAirQualityStatus(aqi)
    };
  }

  private getAirQualityStatus(aqi: number): string {
    if (aqi <= 50) return 'Bon';
    if (aqi <= 100) return 'Modéré';
    if (aqi <= 150) return 'Mauvais';
    return 'Très mauvais';
  }

  private getFallbackWeatherData() {
    return {
      temperature: Math.round(20 + Math.random() * 15),
      humidity: Math.round(30 + Math.random() * 50),
      windSpeed: Math.round(5 + Math.random() * 15),
      windDirection: this.getWindDirection(Math.random() * 360),
      pressure: Math.round(1000 + Math.random() * 20),
      visibility: Math.round(5 + Math.random() * 15),
      condition: ['Ensoleillé', 'Nuageux', 'Pluvieux'][Math.floor(Math.random() * 3)]
    };
  }

  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round((degrees % 360) / 45);
    return directions[index % 8];
  }

  async loadAllZonesData() {
    this.isLoading = true;
    this.error = null;

    try {
      const requests = this.zones.map(zone => 
        forkJoin({
          weather: this.weatherService.getWeatherByCoords(zone.coordinates.lat, zone.coordinates.lng).pipe(
            tap(data => console.log('Weather data for', zone.name, data)),
            catchError(error => {
              console.error(`Error loading weather for ${zone.name}:`, error);
              return of(this.getFallbackWeatherData());
            })
          ),
          airQuality: this.airQualityService.getCurrentAirQuality().pipe(
            catchError(error => {
              console.error(`Error loading air quality for ${zone.name}:`, error);
              return of(null);
            })
          )
        }).pipe(
          catchError(error => {
            console.error(`Global error for zone ${zone.name}:`, error);
            return of(null);
          })
        )
      );

      const results = await Promise.all(requests.map(r => firstValueFrom(r)));
      
      results.forEach((result, index) => {
        if (result) {
          this.zones[index].weather = this.transformWeatherData(result.weather);
          this.zones[index].airQuality = this.transformAirQualityData(result.airQuality);
          this.zones[index].lastUpdate = new Date();
          this.zones[index].alerts = this.checkForAlerts(this.zones[index]);
        }
      });

      this.updateAllMarkers();
    } catch (error) {
      this.error = 'Erreur lors du chargement des données';
      console.error('Error loading zones data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  refreshZone(zone: ZoneData) {
    this.isLoading = true;
    this.weatherService.getWeatherByCoords(zone.coordinates.lat, zone.coordinates.lng)
      .pipe(catchError(() => of(null)))
      .subscribe(weather => {
        zone.weather = this.transformWeatherData(weather);
        this.airQualityService.getCurrentAirQuality()
          .pipe(catchError(() => of(null)))
          .subscribe(air => {
            zone.airQuality = this.transformAirQualityData(air);
            zone.lastUpdate = new Date();
            zone.alerts = this.checkForAlerts(zone);
            this.isLoading = false;
          });
      });
  }

  private checkForAlerts(zone: ZoneData): string[] {
    const alerts: string[] = [];
    if (zone.weather && zone.weather.temperature !== undefined && zone.weather.temperature > 35) {
      alerts.push('🚨 Température élevée');
    }
    if (zone.airQuality && zone.airQuality.aqi !== undefined && zone.airQuality.aqi > 100) {
      alerts.push('⚠️ Qualité d\'air dégradée');
    }
    return alerts;
  }

  private updateAllMarkers() {
    this.zones.forEach(zone => this.updateZoneMarker(zone));
  }

  private updateZoneMarker(zone: ZoneData) {
    const marker = this.markers.get(zone.id);
    if (marker) {
      marker.setIcon(this.getMarkerIcon(zone.type));
      marker.setTitle(`${zone.name}\nDernière mise à jour: ${zone.lastUpdate?.toLocaleTimeString()}`);
    }
  }

  selectZone(zone: ZoneData) {
    this.selectedZone = zone;
    if (this.map) {
      this.map.panTo(zone.coordinates);
      this.map.setZoom(16);
    }
  }

  private initializeMqttConnection() {
    this.mqttSubscription = this.mqttService.getConnectionStatus().subscribe({
      next: (connected) => {
        if (connected) {
          this.subscribeToMqttTopics();
        }
      },
      error: (error) => console.error('MQTT connection error:', error)
    });
  }

  private subscribeToMqttTopics() {
    this.zones.forEach(zone => {
      this.mqttService.getAlerts().subscribe((update: any) => {
        this.ngZone.run(() => {
          this.handleZoneUpdate(zone.id, update);
        });
      });
    });
  }

  private handleZoneUpdate(zoneId: string, data: any) {
    const zone = this.zones.find(z => z.id === zoneId);
    if (!zone) return;

    if (data.type === 'weather') {
      zone.weather = this.transformWeatherData(data);
    } else if (data.type === 'air') {
      zone.airQuality = this.transformAirQualityData(data);
    }

    zone.lastUpdate = new Date();
    zone.alerts = this.checkForAlerts(zone);
    this.updateZoneMarker(zone);
  }

  private startAutoRefresh() {
    if (this.autoRefresh) {
      this.subscription = interval(this.refreshInterval * 60 * 1000)
        .subscribe(() => this.loadAllZonesData());
    }
  }

  private stopAutoRefresh() {
    this.subscription?.unsubscribe();
  }

  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  private cleanup() {
    this.stopAutoRefresh();
    this.mqttSubscription?.unsubscribe();
    this.markers.forEach(marker => marker.setMap(null));
    this.markers.clear();
  }

  getActiveAlertsCount(): number {
    return this.zones.reduce((count, zone) => count + (zone.alerts?.length || 0), 0);
  }

  getPureAirZonesCount(): number {
    return this.zones.filter(zone => zone.airQuality && zone.airQuality.aqi !== undefined && zone.airQuality.aqi <= 50).length;
  }

  getHotZonesCount(): number {
    return this.zones.filter(zone => zone.weather && zone.weather.temperature !== undefined && zone.weather.temperature > 30).length;
  }
}