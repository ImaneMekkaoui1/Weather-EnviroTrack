import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { WeatherService } from '../../shared/services/weather.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Subject } from 'rxjs';
import * as L from 'leaflet';

@Component({
  selector: 'app-weather-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './weather-details.component.html',
  styleUrls: ['./weather-details.component.css']
})
export class WeatherDetailsComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  
  selectedLocation = 'Casablanca,MA';
  searchQuery = '';
  searchResults: any[] = [];
  map: L.Map | null = null;
  marker: L.Marker | null = null;
  isLoading = false;
  searchLat: number | null = null;
  searchLon: number | null = null;
  
  hourlyForecast: any[] = [];
  dailyForecast: any[] = [];
  currentWeather = {
    temp: 0,
    feelsLike: 0,
    condition: '',
    icon: '',
    humidity: 0,
    pressure: 0,
    visibility: 0
  };
  
  weatherDetails = {
    wind: {
      speed: 0,
      direction: 'N/A'
    },
    humidity: 0,
    pressure: 0,
    visibility: 0
  };
  
  sunrise: Date = new Date();
  sunset: Date = new Date();
  errorMessage: string = '';
  
  private searchTerms = new Subject<string>();
  private moroccoBounds = L.latLngBounds(
    L.latLng(27.5, -13.5),
    L.latLng(36.5, -0.5)
  );

  constructor(private weatherService: WeatherService) {}

  ngOnInit() {
    this.loadWeatherData(this.selectedLocation);
    
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length > 2) {
          return this.weatherService.searchLocations(query).pipe(
            catchError(err => of({ locations: [] }))
          );
        }
        return of({ locations: [] });
      })
    ).subscribe({
      next: (results: any) => {
        this.searchResults = results.locations || [];
      },
      error: (err) => {
        this.searchResults = [];
        this.errorMessage = 'Erreur de recherche';
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(31.7917, -7.0926), 100);
  }

  loadWeatherData(city: string) {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.weatherService.getDetailedWeather(city).pipe(
      finalize(() => this.isLoading = false),
      catchError(error => {
        this.errorMessage = 'Erreur de chargement';
        this.generateMockForecastData();
        return of(null);
      })
    ).subscribe({
      next: (data) => {
        if (!data) return;
        
        this.currentWeather = data.current;
        this.weatherDetails = {
          wind: data.wind,
          humidity: data.current.humidity,
          pressure: data.current.pressure,
          visibility: data.current.visibility
        };

        this.sunrise = new Date(data.sunrise * 1000);
        this.sunset = new Date(data.sunset * 1000);

        this.hourlyForecast = data.hourly.length > 0 ? data.hourly : this.generateMockHourlyData();
        this.dailyForecast = data.daily.length > 0 ? data.daily : this.generateMockDailyData();

        if (data.coord) {
          this.updateMap(data.coord.lat, data.coord.lon);
        }
      }
    });
  }

  loadWeatherByCoordinates(lat: number, lon: number) {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.weatherService.getWeatherByCoords(lat, lon).pipe(
      finalize(() => this.isLoading = false),
      catchError(error => {
        this.errorMessage = 'Erreur lors du chargement de la météo par coordonnées';
        this.updateMap(lat, lon);
        this.generateMockForecastData();
        return of(null);
      })
    ).subscribe({
      next: (data) => {
        if (!data) return;
        
        if (data.name) {
          this.selectedLocation = `${data.name},${data.sys?.country || 'MA'}`;
          this.searchQuery = data.name;
        } else {
          this.selectedLocation = `Position (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
          this.searchQuery = 'Position actuelle';
        }

        if (data.current) {
          this.currentWeather = data.current;
          this.weatherDetails = {
            wind: data.wind || { speed: 0, direction: 'N/A' },
            humidity: data.current.humidity || 0,
            pressure: data.current.pressure || 0,
            visibility: data.current.visibility || 0
          };

          this.sunrise = new Date(data.sunrise * 1000);
          this.sunset = new Date(data.sunset * 1000);

          this.hourlyForecast = data.forecast?.hourly && data.forecast.hourly.length > 0 
            ? data.forecast.hourly 
            : this.generateMockHourlyData();
            
          this.dailyForecast = data.forecast?.daily && data.forecast.daily.length > 0 
            ? data.forecast.daily 
            : this.generateMockDailyData();
        } else {
          this.generateMockForecastData();
        }

        this.updateMap(lat, lon);
      }
    });
  }

  searchByCoordinates() {
    if (this.searchLat !== null && this.searchLon !== null) {
      this.loadWeatherByCoordinates(this.searchLat, this.searchLon);
    } else {
      this.errorMessage = 'Veuillez entrer des coordonnées valides';
    }
  }

  searchLocation() {
    if (this.searchQuery.trim().length > 2) {
      this.searchTerms.next(this.searchQuery);
    } else {
      this.searchResults = [];
    }
  }

  selectLocation(location: any) {
    if (location.id) {
      this.selectedLocation = location.id;
    } else {
      this.selectedLocation = `${location.name},${location.country}`;
    }
    this.searchResults = [];
    this.searchQuery = location.name;
    this.loadWeatherData(this.selectedLocation);
  }

  useCurrentLocation() {
    if (navigator.geolocation) {
      this.isLoading = true;
      this.errorMessage = '';
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          this.loadWeatherByCoordinates(lat, lon);
        },
        (error) => {
          this.isLoading = false;
          switch(error.code) {
            case error.PERMISSION_DENIED:
              this.errorMessage = 'Permission de géolocalisation refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              this.errorMessage = 'Position non disponible';
              break;
            case error.TIMEOUT:
              this.errorMessage = 'Délai de localisation dépassé';
              break;
            default:
              this.errorMessage = 'Erreur de géolocalisation';
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      this.errorMessage = 'Géolocalisation non supportée par votre navigateur';
    }
  }

  refreshWeather() {
    if (this.selectedLocation.startsWith('Position (')) {
      // Pour les positions par coordonnées
      const latLonPattern = /Position \((\d+\.\d+), (\d+\.\d+)\)/;
      const match = this.selectedLocation.match(latLonPattern);
      if (match && match.length === 3) {
        this.loadWeatherByCoordinates(parseFloat(match[1]), parseFloat(match[2]));
      } else {
        // Essayer d'utiliser la géolocalisation à nouveau
        this.useCurrentLocation();
      }
    } else {
      // Pour les villes normales
      this.loadWeatherData(this.selectedLocation);
    }
  }

  focusOnMorocco() {
    if (this.map) {
      this.map.fitBounds(this.moroccoBounds);
    }
  }

  generateMockForecastData() {
    this.hourlyForecast = this.generateMockHourlyData();
    this.dailyForecast = this.generateMockDailyData();
  }

  generateMockHourlyData() {
    const hourlyData = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const hourTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      hourlyData.push({
        time: hourTime,
        temp: Math.round(18 + Math.sin(i/4) * 5),
        precipitation: Math.round(Math.random() * 30),
        windSpeed: Math.round(5 + Math.random() * 10),
        condition: i % 2 === 0 ? 'Nuageux' : 'Partiellement nuageux',
        icon: `https://openweathermap.org/img/wn/${i % 2 === 0 ? '04d' : '03d'}@2x.png`
      });
    }
    
    return hourlyData;
  }

  generateMockDailyData() {
    const dailyData = [];
    const now = new Date();
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const conditions = ['Nuageux', 'Ensoleillé', 'Partiellement nuageux', 'Pluvieux', 'Orageux'];
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dayIndex = dayDate.getDay();
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const icon = condition === 'Ensoleillé' ? '01d' : 
                   condition === 'Partiellement nuageux' ? '03d' :
                   condition === 'Nuageux' ? '04d' :
                   condition === 'Pluvieux' ? '10d' : '11d';
      
      dailyData.push({
        date: dayDate,
        day: days[dayIndex],
        maxTemp: Math.round(20 + Math.random() * 8),
        minTemp: Math.round(12 + Math.random() * 5),
        condition: condition,
        precipitation: Math.round(Math.random() * 60),
        icon: `https://openweathermap.org/img/wn/${icon}@2x.png`
      });
    }
    
    return dailyData;
  }

  private initMap(lat: number, lon: number) {
    try {
      if (!this.mapContainer?.nativeElement) {
        console.error('Élément conteneur de carte manquant');
        return;
      }

      this.map = L.map(this.mapContainer.nativeElement, {
        attributionControl: false,
        zoomControl: false
      });
      
      this.map.fitBounds(this.moroccoBounds);
      
      L.control.zoom({ position: 'topright' }).addTo(this.map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this.map);

      try {
        const tempLayerUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=ec913b7fdd14671f4217e729e7842d61`;
        L.tileLayer(tempLayerUrl, {
          maxZoom: 19,
          opacity: 0.6
        }).addTo(this.map);
      } catch (e) {
        console.warn('Impossible de charger la couche de température:', e);
      }

      this.marker = L.marker([lat, lon], {
        icon: L.divIcon({
          className: 'weather-marker',
          html: '<div class="weather-marker-content"><i class="fas fa-map-marker-alt"></i></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 30]
        })
      }).addTo(this.map);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
      this.errorMessage = 'Impossible d\'initialiser la carte.';
    }
  }

  private updateMap(lat: number, lon: number) {
    if (!this.map) {
      this.initMap(lat, lon);
      return;
    }
    
    try {
      if (!this.marker) {
        this.marker = L.marker([lat, lon], {
          icon: L.divIcon({
            className: 'weather-marker',
            html: '<div class="weather-marker-content"><i class="fas fa-map-marker-alt"></i></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          })
        }).addTo(this.map);
      } else {
        this.marker.setLatLng([lat, lon]);
      }
      
      this.map.flyTo([lat, lon], 10, { duration: 1, easeLinearity: 0.1 });

      const popupContent = `
        <div class="text-center">
          <h4 class="font-bold">${this.selectedLocation}</h4>
          <p>${this.currentWeather.temp}°C - ${this.currentWeather.condition}</p>
          ${this.currentWeather.icon ? `<img src="${this.currentWeather.icon}" alt="Weather" class="mx-auto">` : ''}
        </div>
      `;
      
      this.marker.bindPopup(popupContent).openPopup();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la carte:', error);
    }
  }
}