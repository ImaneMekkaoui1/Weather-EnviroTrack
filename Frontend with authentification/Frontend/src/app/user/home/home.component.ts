import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WeatherService } from '../../shared/services/weather.service';
import { Observable, firstValueFrom } from 'rxjs';

interface OCPSite {
  name: string;
  lat: number;
  lng: number;
  info: string;
  type?: string;
  status?: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: string;
  condition?: string;
  lastUpdated?: Date;
}

interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    condition: string;
    icon: string;
    humidity: number;
    pressure: number;
    visibility: number;
  };
  wind: {
    speed: number;
    direction: string;
  };
  name?: string;
  coord?: {
    lat: number;
    lon: number;
  };
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class HomeComponent implements OnInit {
  isDragging: any;
  onGalleryDrag($event: MouseEvent) {
    throw new Error('Method not implemented.');
  }
  startGalleryDrag($event: MouseEvent) {
    throw new Error('Method not implemented.');
  }
  galleryPhotos: any;
  galleryCurrentIndex: any;
  isGalleryFullscreen: any;
  nextGallerySlide() {
    throw new Error('Method not implemented.');
  }
  toggleGalleryFullscreen() {
    throw new Error('Method not implemented.');
  }

  searchQuery: string = '';
  searchResults: OCPSite[] = [];
  mobileMenuOpen: boolean = false;
  showSearchResults: boolean = false;
  selectedSite: OCPSite | null = null;
  loading: boolean = false;
  currentTime = new Date();
  weatherUpdateInterval: any;
  mapLoaded: boolean = false;
  
  ocpSites: OCPSite[] = [
    { 
      name: 'Jorf Lasfar', 
      lat: 33.1063, 
      lng: -8.6383, 
      info: 'Complexe industriel chimique',
      type: 'Complexe industriel',
      status: 'Actif'
    },
    { 
      name: 'Khouribga', 
      lat: 32.8811, 
      lng: -6.9063, 
      info: 'Site d\'extraction de phosphate',
      type: 'Mine de phosphate',
      status: 'Actif'
    },
    { 
      name: 'Safi', 
      lat: 32.2994, 
      lng: -9.2372, 
      info: 'Site industriel et portuaire',
      type: 'Complexe industriel',
      status: 'Actif'
    },
    { 
      name: 'Benguerir', 
      lat: 32.2316, 
      lng: -7.9501, 
      info: 'Mine de phosphate',
      type: 'Mine de phosphate',
      status: 'Actif'
    },
    { 
      name: 'Youssoufia', 
      lat: 32.2464, 
      lng: -8.5277, 
      info: 'Site d\'extraction',
      type: 'Mine de phosphate',
      status: 'Actif'
    },
    { 
      name: 'Laâyoune', 
      lat: 27.1536, 
      lng: -13.2033, 
      info: 'Site de traitement',
      type: 'Usine de traitement',
      status: 'Actif'
    },
    { 
      name: 'Boucraâ', 
      lat: 26.3226, 
      lng: -12.8503, 
      info: 'Mine de phosphate',
      type: 'Mine de phosphate',
      status: 'Actif'
    },
    { 
      name: 'Mzinda', 
      lat: 33.2568, 
      lng: -8.5285, 
      info: 'Complexe industriel',
      type: 'Complexe industriel',
      status: 'Actif'
    },
    { 
      name: 'Casablanca', 
      lat: 33.5731, 
      lng: -7.5898, 
      info: 'Siège social',
      type: 'Bureau administratif',
      status: 'Actif'
    },
    { 
      name: 'Gantour', 
      lat: 32.2000, 
      lng: -8.3000, 
      info: 'Bassin minier',
      type: 'Mine de phosphate',
      status: 'Actif'
    }
  ];
  
  map: any;
  markers: any[] = [];
  infoWindows: any[] = [];

  // Add new properties for the slideshow
  heroImages = [
    'https://images.unsplash.com/photo-1601134467661-3d775b999c8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    'https://images.unsplash.com/photo-1592210454359-9043f067919b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    'https://images.unsplash.com/photo-1534088568595-a066f410bcda?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    'https://images.unsplash.com/photo-1501691223387-dd05029d6490?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    'https://images.unsplash.com/photo-1519692933481-e162a57d6721?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
  ];
  currentImageIndex = 0;
  slideshowInterval: any;
  imagesLoaded = false;

  constructor(
    private router: Router,
    private weatherService: WeatherService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.preloadImages();
    this.fetchWeatherDataForAllSites();
    this.fetchElJadidaWeather();
    this.loadGoogleMaps();
    this.setupCustomEventListener();
    
    // Mettre à jour les données météo toutes les 30 minutes
    this.weatherUpdateInterval = setInterval(() => {
      this.fetchWeatherDataForAllSites();
      this.fetchElJadidaWeather();
      this.currentTime = new Date();
    }, 30 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.weatherUpdateInterval) {
      clearInterval(this.weatherUpdateInterval);
    }
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval);
    }
  }

  async fetchWeatherDataForAllSites(): Promise<void> {
    const promises = this.ocpSites.map(site => 
      this.getWeatherForSite(site)
    );

    try {
      const updatedSites = await Promise.all(promises);
      
      this.ngZone.run(() => {
        this.ocpSites = updatedSites;
        this.loading = false;
        
        // Si la carte est déjà chargée, mettre à jour les marqueurs
        if (this.mapLoaded && this.map) {
          this.addMarkersToMap();
        }
        
        // Si un site est sélectionné, mettre à jour ses informations
        if (this.selectedSite) {
          this.selectedSite = this.ocpSites.find(site => site.name === this.selectedSite?.name) || null;
        }
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des données météo:", error);
      this.loading = false;
    }
  }

  async getWeatherForSite(site: OCPSite): Promise<OCPSite> {
    try {
      // Utilisation de la méthode correcte du WeatherService
      const weatherData = await firstValueFrom(
        this.weatherService.getWeatherByCoords(site.lat, site.lng)
      );
      
      if (weatherData && weatherData.current) {
        return {
          ...site,
          temperature: weatherData.current.temp,
          humidity: weatherData.current.humidity,
          windSpeed: weatherData.wind?.speed || 0,
          windDirection: weatherData.wind?.direction || 'N/A',
          condition: weatherData.current.condition,
          lastUpdated: new Date()
        };
      }
      return site;
    } catch (error) {
      console.error(`Erreur lors de la récupération des données météo pour ${site.name}:`, error);
      return site;
    }
  }

  loadGoogleMaps(): void {
    // Vérifier si le div de la carte existe
    if (!document.getElementById('google-map')) {
      console.error("L'élément avec l'id 'google-map' n'existe pas dans le DOM");
      return;
    }

    // Vérifier si l'API Google Maps est déjà chargée
    if (!window.google || !window.google.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBFMlKlMHoR3A0JzJcByylIkjqzxScZdY0&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      // Définir la fonction de callback globale
      window.initMap = () => {
        this.ngZone.run(() => {
          this.initializeMap();
        });
      };
      
      // Gérer les erreurs de chargement de l'API
      script.onerror = () => {
        console.error("Erreur lors du chargement de l'API Google Maps");
        this.handleMapError();
      };
      
      document.head.appendChild(script);
    } else {
      // Si l'API est déjà chargée, initialiser la carte directement
      setTimeout(() => this.initializeMap(), 500);
    }
  }

  initializeMap(): void {
    try {
      const mapElement = document.getElementById('google-map');
      if (!mapElement) {
        console.error("L'élément de carte n'existe pas dans le DOM");
        return;
      }

      this.map = new window.google.maps.Map(mapElement, {
        center: { lat: 31.7917, lng: -7.0926 },
        zoom: 6,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: this.getMapStyles()
      });
      
      this.mapLoaded = true;
      this.addMarkersToMap();
    } catch (error) {
      console.error("Erreur lors de l'initialisation de la carte:", error);
      this.handleMapError();
    }
  }

  handleMapError(): void {
    const mapElement = document.getElementById('google-map');
    if (mapElement) {
      mapElement.innerHTML = `
        <div class="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
          <div class="text-center p-6">
            <i class="fas fa-map-marked-alt text-5xl text-gray-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-700 mb-2">Carte non disponible</h3>
            <p class="text-gray-500">La carte n'a pas pu être chargée. Veuillez vérifier votre connexion internet.</p>
          </div>
        </div>
      `;
    }
  }

  getMapStyles(): any[] {
    return [
      {
        "featureType": "administrative",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#444444"}]
      },
      {
        "featureType": "landscape",
        "elementType": "all",
        "stylers": [{"color": "#f2f2f2"}]
      },
      {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [{"visibility": "off"}]
      },
      {
        "featureType": "road",
        "elementType": "all",
        "stylers": [{"saturation": -100}, {"lightness": 45}]
      },
      {
        "featureType": "road.highway",
        "elementType": "all",
        "stylers": [{"visibility": "simplified"}]
      },
      {
        "featureType": "road.arterial",
        "elementType": "labels.icon",
        "stylers": [{"visibility": "off"}]
      },
      {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [{"visibility": "off"}]
      },
      {
        "featureType": "water",
        "elementType": "all",
        "stylers": [{"color": "#46bcec"}, {"visibility": "on"}]
      }
    ];
  }

  addMarkersToMap(): void {
    if (!this.map || !window.google || !this.mapLoaded) return;
    
    this.clearMarkers();
    
    this.ocpSites.forEach(site => {
      try {
        const marker = new window.google.maps.Marker({
          position: { lat: site.lat, lng: site.lng },
          map: this.map,
          title: site.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#0d9488',
            fillOpacity: 0.8,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          }
        });
        
        const infoWindow = new window.google.maps.InfoWindow({
          content: this.getInfoWindowContent(site)
        });
        
        marker.addListener('click', () => {
          this.ngZone.run(() => {
            this.infoWindows.forEach(iw => iw.close());
            infoWindow.open(this.map, marker);
            this.showSiteDetails(site);
          });
        });
        
        this.markers.push(marker);
        this.infoWindows.push(infoWindow);
      } catch (error) {
        console.error(`Erreur lors de l'ajout du marqueur pour ${site.name}:`, error);
      }
    });
  }

  getInfoWindowContent(site: OCPSite): string {
    return `
      <div class="p-2" style="min-width: 250px;">
        <h3 class="font-semibold text-lg">${site.name}</h3>
        <p class="text-gray-600 text-sm">${site.info}</p>
        <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            ${site.type || 'N/A'}
          </div>
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            ${site.status || 'N/A'}
          </div>
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-4.9-6.9M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            ${site.temperature !== undefined ? `${site.temperature}°C` : 'N/A'}
          </div>
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            ${site.humidity !== undefined ? `${site.humidity}%` : 'N/A'}
          </div>
        </div>
        <div class="mt-3">
          <button onclick="document.dispatchEvent(new CustomEvent('showSiteDetails', {detail: '${site.name}'}))" 
                  class="w-full bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-sm">
            Voir les détails
          </button>
        </div>
      </div>
    `;
  }

  clearMarkers(): void {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
    this.infoWindows = [];
  }

  onSearch(): void {
    if (this.searchQuery.trim() === '') {
      this.resetSearch();
      return;
    }
    
    this.searchResults = this.ocpSites.filter(site => 
      site.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
    
    this.showSearchResults = true;
    
    if (this.searchResults.length > 0 && this.map && window.google && this.mapLoaded) {
      const firstResult = this.searchResults[0];
      this.map.setCenter({ lat: firstResult.lat, lng: firstResult.lng });
      this.map.setZoom(10);
      this.highlightSearchResults();
      this.selectedSite = firstResult;
    } else {
      this.selectedSite = null;
    }
  }

  highlightSearchResults(): void {
    if (!this.map || !window.google || !this.mapLoaded) return;
    
    this.clearMarkers();
    
    this.ocpSites.forEach(site => {
      const isSearchResult = this.searchResults.some(s => s.name === site.name);
      
      try {
        const marker = new window.google.maps.Marker({
          position: { lat: site.lat, lng: site.lng },
          map: this.map,
          title: site.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: isSearchResult ? 10 : 6,
            fillColor: isSearchResult ? '#0d9488' : '#9ca3af',
            fillOpacity: isSearchResult ? 0.9 : 0.6,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          }
        });
        
        const infoWindow = new window.google.maps.InfoWindow({
          content: this.getInfoWindowContent(site)
        });
        
        marker.addListener('click', () => {
          this.ngZone.run(() => {
            this.infoWindows.forEach(iw => iw.close());
            infoWindow.open(this.map, marker);
            this.showSiteDetails(site);
          });
        });
        
        this.markers.push(marker);
        this.infoWindows.push(infoWindow);
        
        if (isSearchResult) {
          infoWindow.open(this.map, marker);
        }
      } catch (error) {
        console.error(`Erreur lors de l'ajout du marqueur pour ${site.name}:`, error);
      }
    });
  }

  searchSite(siteName: string): void {
    this.searchQuery = siteName;
    this.onSearch();
  }

  showSiteDetails(site: OCPSite): void {
    this.selectedSite = site;
    
    if (this.map && window.google && this.mapLoaded) {
      this.map.setCenter({ lat: site.lat, lng: site.lng });
      this.map.setZoom(12);
      
      const markerIndex = this.ocpSites.findIndex(s => s.name === site.name);
      if (markerIndex >= 0 && this.infoWindows[markerIndex]) {
        this.infoWindows.forEach(iw => iw.close());
        this.infoWindows[markerIndex].open(this.map, this.markers[markerIndex]);
      }
    }
    
    setTimeout(() => {
      const element = document.getElementById('map');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }

  // Pour gérer l'événement personnalisé depuis l'infoWindow
  setupCustomEventListener(): void {
    document.addEventListener('showSiteDetails', (event: any) => {
      this.ngZone.run(() => {
        const siteName = event.detail;
        const site = this.ocpSites.find(s => s.name === siteName);
        if (site) {
          this.showSiteDetails(site);
        }
      });
    });
  }

  resetSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
    this.selectedSite = null;
    
    this.addMarkersToMap();
    
    if (this.map && this.mapLoaded) {
      this.map.setCenter({ lat: 31.7917, lng: -7.0926 });
      this.map.setZoom(6);
    }
  }

  exportSiteData(): void {
    if (!this.selectedSite) return;
    
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(18);
    doc.text(`Données du site: ${this.selectedSite.name}`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Export généré le: ${date}`, 14, 30);
    
    autoTable(doc, {
      head: [['Informations générales']],
      body: [
        ['Nom', this.selectedSite.name],
        ['Type', this.selectedSite.type || 'N/A'],
        ['Statut', this.selectedSite.status || 'N/A'],
        ['Localisation', `${this.selectedSite.lat.toFixed(4)}, ${this.selectedSite.lng.toFixed(4)}`],
        ['Dernière mise à jour', this.selectedSite.lastUpdated?.toLocaleString() || 'N/A']
      ],
      startY: 40,
      styles: { fontSize: 10 },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 12
      }
    });
    
    autoTable(doc, {
      head: [['Conditions actuelles']],
      body: [
        ['Température', `${this.selectedSite.temperature !== undefined ? this.selectedSite.temperature : 'N/A'} °C`],
        ['Humidité', `${this.selectedSite.humidity !== undefined ? this.selectedSite.humidity : 'N/A'} %`],
        ['Vent', `${this.selectedSite.windSpeed !== undefined ? this.selectedSite.windSpeed : 'N/A'} km/h ${this.selectedSite.windDirection || 'N/A'}`]
      ],
      startY: (doc as any).lastAutoTable.finalY + 20,
      styles: { fontSize: 10 },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 12
      }
    });
    
    doc.save(`donnees_site_${this.selectedSite.name.replace(/\s+/g, '_')}_${date}.pdf`);
  }

  generateReport(): void {
    this.exportSiteData();
  }

  getWindDirectionRotation(direction: string | undefined): string {
    if (!direction) return 'rotate-0';
    
    const directions: { [key: string]: string } = {
      'Nord': 'rotate-0',
      'Nord-Est': 'rotate-45',
      'Est': 'rotate-90',
      'Sud-Est': 'rotate-135',
      'Sud': 'rotate-180',
      'Sud-Ouest': 'rotate-225',
      'Ouest': 'rotate-270',
      'Nord-Ouest': 'rotate-315'
    };
    
    return directions[direction] || 'rotate-0';
  }

  viewSiteDetails(): void {
    if (this.selectedSite) {
      this.router.navigate(['/sites', this.selectedSite.name.toLowerCase().replace(/\s+/g, '-')]);
    }
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    
    if (this.mobileMenuOpen) {
      this.toggleMobileMenu();
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

// Ajoutez ces propriétés à votre classe HomeComponent
elJadidaWeather: any = null;
elJadidaCoords = { lat: 33.2568, lng: -8.5028 }; // Coordonnées pour El Jadida

// Ajoutez cette méthode à votre classe HomeComponent
async fetchElJadidaWeather(): Promise<void> {
  try {
    this.elJadidaWeather = await firstValueFrom(
      this.weatherService.getWeatherByCoords(this.elJadidaCoords.lat, this.elJadidaCoords.lng)
    );
    console.log('El Jadida weather data:', this.elJadidaWeather);
  } catch (error) {
    console.error("Erreur lors de la récupération des données météo pour El Jadida:", error);
    this.elJadidaWeather = null;
  }
}

// Ajoutez cette méthode pour obtenir le nom du jour
getDayName(date: Date | string): string {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const dateObj = new Date(date);
  return days[dateObj.getDay()];
}

// Remplacez la méthode getWeatherIcon dans votre classe
getWeatherIcon(condition: string | undefined): string {
  if (!condition) return 'wi wi-na';
  
  condition = condition.toLowerCase();
  
  if (condition.includes('soleil') || condition.includes('ensoleillé') || condition.includes('clair')) {
    return 'wi wi-day-sunny';
  } else if (condition.includes('nuage') || condition.includes('couvert')) {
    return 'wi wi-cloudy';
  } else if (condition.includes('pluie') || condition.includes('averse')) {
    return 'wi wi-rain';
  } else if (condition.includes('orage')) {
    return 'wi wi-thunderstorm';
  } else if (condition.includes('neige')) {
    return 'wi wi-snow';
  } else if (condition.includes('brouillard') || condition.includes('brume')) {
    return 'wi wi-fog';
  }
  
  return 'wi wi-day-cloudy';
}

preloadImages(): void {
  let firstLoaded = false;
  this.heroImages.forEach((src) => {
    const img = new Image();
    img.onload = () => {
      if (!firstLoaded) {
        this.ngZone.run(() => {
          this.imagesLoaded = true;
          this.startSlideshow();
        });
        firstLoaded = true;
      }
    };
    img.src = src;
  });
}

nextImage(): void {
  this.currentImageIndex = (this.currentImageIndex + 1) % this.heroImages.length;
}

prevImage(): void {
  this.currentImageIndex = (this.currentImageIndex - 1 + this.heroImages.length) % this.heroImages.length;
}

startSlideshow(): void {
  if (this.slideshowInterval) {
    clearInterval(this.slideshowInterval);
  }
  this.slideshowInterval = setInterval(() => {
    this.nextImage();
  }, 6000);
}
}