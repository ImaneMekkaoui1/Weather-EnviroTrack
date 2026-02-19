import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CapteurService, Capteur, HistoryEntry } from '../../shared/services/sensor.service';
import * as L from 'leaflet';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { icon, Marker } from 'leaflet';

interface Sensor {
  id: number;
  name: string;
  type: string;
  status: string;
  location?: string;
  isMapLocation: boolean;
  coordinates?: { x: number; y: number };
  history?: HistoryEntry[];
}

interface Alert {
  id: string;
  severity: 'success' | 'info' | 'warning' | 'danger';
  message: string;
  details: string;
  timeout?: any;
}

@Component({
  selector: 'app-manage-sensors',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './manage-sensors.component.html',
  styleUrls: ['./manage-sensors.component.css']
})
export class ManageSensorsComponent implements OnInit, AfterViewInit, OnDestroy {
  // Sensors data
  sensors: Sensor[] = [];
  currentSensor: Sensor = this.getEmptySensor();
  selectedSensor: Sensor | null = null;
  selectedHistorySensor: Sensor | null = null;
  sensorIdToDelete: number | null = null;

  // UI state
  loading = true;
  error: string | null = null;
  isConnected = true;
  showModal = false;
  showMapModal = false;
  showHistoryModal = false;
  showDeleteConfirmation = false;
  editMode = false;
  mapInitialized = false;
  alerts: Alert[] = [];

  // History editing
  editingHistoryIndex = -1;
  editingHistoryComment = '';
  editingHistoryStatus = '';
  historyComment = '';

  // Maps
  private map: L.Map | null = null;
  private viewMap: L.Map | null = null;
  private marker: L.Marker | null = null;
  private viewMarker: L.Marker | null = null;
  
  private defaultIcon = icon({
    iconUrl: '/assets/images/marker-icon.png',
    shadowUrl: '/assets/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  
  mapLoading = false;
  mapLoadAttempts = 0;
  readonly MAX_MAP_LOAD_ATTEMPTS = 3;
  
  constructor(private capteurService: CapteurService) { }

  ngOnInit() {
    // Assurez-vous que Leaflet est disponible globalement
    if (!window.L) {
      console.error('Leaflet is not loaded');
      return;
    }
    this.loadSensors();
  }

  ngAfterViewInit() {
    // Maps will be initialized when modal opens
  }

  ngOnDestroy() {
    // Clean up maps
    if (this.map) {
      this.map.remove();
    }
    if (this.viewMap) {
      this.viewMap.remove();
    }
  }

  // SENSOR OPERATIONS
  loadSensors() {
    this.loading = true;
    this.error = null;
    
    this.capteurService.getCurrentCapteurs().subscribe({
      next: (capteurs) => {
        this.sensors = capteurs.map(capteur => this.mapCapteurToSensor(capteur));
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load sensors', err);
        this.error = 'Erreur lors du chargement des capteurs. Veuillez réessayer plus tard.';
        this.loading = false;
        this.isConnected = false;
      }
    });
  }

  mapCapteurToSensor(capteur: Capteur): Sensor {
    const isMapLocation = capteur.localisation.startsWith('MAP:');
    let coordinates;
    
    if (isMapLocation) {
      try {
        const coordsStr = capteur.localisation.substring(4);
        const [x, y] = coordsStr.split(',').map(Number);
        coordinates = { x, y };
      } catch (e) {
        console.error('Invalid map coordinates', e);
      }
    }
    
    return {
      id: capteur.id,
      name: capteur.nom,
      type: capteur.type,
      status: capteur.statut,
      location: isMapLocation ? undefined : capteur.localisation,
      isMapLocation,
      coordinates,
      history: []
    };
  }

  mapSensorToCapteur(sensor: Sensor): Omit<Capteur, 'id'> {
    let localisation: string;
    
    if (sensor.isMapLocation && sensor.coordinates) {
      localisation = `MAP:${sensor.coordinates.x},${sensor.coordinates.y}`;
    } else {
      localisation = sensor.location || '';
    }
    
    return {
      nom: sensor.name,
      type: sensor.type,
      statut: sensor.status,
      localisation,
      commentaire: '',
      dateCreation: new Date().toISOString(),
      derniereModification: new Date().toISOString()
    };
  }

  getEmptySensor(): Sensor {
    return {
      id: 0,
      name: '',
      type: 'temperature',
      status: 'actif',
      location: '',
      isMapLocation: false,
      history: []
    };
  }

  saveSensor() {
    if (this.validateSensor()) {
      if (this.editMode) {
        this.updateSensor();
      } else {
        this.addSensor();
      }
    }
  }

  validateSensor(): boolean {
    if (!this.currentSensor.name.trim()) {
      this.showAlert('warning', 'Validation échouée', 'Le nom du capteur est requis.');
      return false;
    }

    if (this.currentSensor.isMapLocation && !this.currentSensor.coordinates) {
      this.showAlert('warning', 'Validation échouée', 'Veuillez sélectionner un emplacement sur la carte.');
      return false;
    }

    if (!this.currentSensor.isMapLocation && !this.currentSensor.location?.trim()) {
      this.showAlert('warning', 'Validation échouée', 'La localisation du capteur est requise.');
      return false;
    }

    return true;
  }

  addSensor() {
    if (!this.validateSensor()) return;

    const capteur = this.mapSensorToCapteur(this.currentSensor);
    
    // Ajout de logs pour le débogage
    console.log('Creating sensor with data:', capteur);
    
    this.capteurService.createCapteur(capteur).subscribe({
      next: (newCapteur) => {
        console.log('Sensor created successfully:', newCapteur);
        const newSensor = this.mapCapteurToSensor(newCapteur);
        this.sensors.push(newSensor);
        this.closeModal();
        this.showAlert('success', 'Capteur ajouté', `Le capteur "${newSensor.name}" a été ajouté avec succès.`);
      },
      error: (err) => {
        console.error('Failed to add sensor:', err);
        this.showAlert('danger', 'Erreur', 'Échec de l\'ajout du capteur. Veuillez réessayer.');
      }
    });
  }

  updateSensor() {
    const capteur = this.mapSensorToCapteur(this.currentSensor);
    this.capteurService.updateCapteur(this.currentSensor.id, capteur).subscribe({
      next: (updatedCapteur) => {
        const updatedSensor = this.mapCapteurToSensor(updatedCapteur);
        const index = this.sensors.findIndex(s => s.id === updatedSensor.id);
        if (index !== -1) {
          // Preserve history
          updatedSensor.history = this.sensors[index].history;
          this.sensors[index] = updatedSensor;
        }
        this.closeModal();
        this.showAlert('success', 'Capteur mis à jour', `Le capteur "${updatedSensor.name}" a été mis à jour avec succès.`);
      },
      error: (err) => {
        console.error('Failed to update sensor', err);
        this.showAlert('danger', 'Erreur', 'Échec de la mise à jour du capteur. Veuillez réessayer.');
      }
    });
  }

  // MODAL OPERATIONS
  openAddSensorModal() {
    this.editMode = false;
    this.currentSensor = this.getEmptySensor();
    this.showModal = true;
    this.mapInitialized = false;
    this.mapLoading = true;
    this.mapLoadAttempts = 0;
  }

  editSensor(sensor: Sensor) {
    this.editMode = true;
    // Create a deep copy to avoid direct reference modifications
    this.currentSensor = JSON.parse(JSON.stringify(sensor));
    this.showModal = true;
    this.mapInitialized = false;
    
    // Initialize map after DOM is ready
    setTimeout(() => {
      this.initMap();
      // If it's a map location, set the marker
      if (this.currentSensor.isMapLocation && this.currentSensor.coordinates && this.map) {
        this.setMapMarker(this.currentSensor.coordinates);
      }
    }, 100);
  }

  closeModal() {
    this.showModal = false;
    this.currentSensor = this.getEmptySensor();
    
    // Clean up map
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  showLocationOnMap(sensor: Sensor) {
    this.selectedSensor = sensor;
    this.showMapModal = true;
    
    // Initialize view map after DOM is ready
    setTimeout(() => this.initViewMap(), 100);
  }

  closeMapModal() {
    this.showMapModal = false;
    this.selectedSensor = null;
    
    // Clean up view map
    if (this.viewMap) {
      this.viewMap.remove();
      this.viewMap = null;
    }
  }

  // HISTORY OPERATIONS
  openHistoryModal(sensor: Sensor) {
    this.selectedHistorySensor = JSON.parse(JSON.stringify(sensor));
    this.historyComment = '';
    this.editingHistoryIndex = -1;
    
    // Load history from server
    this.capteurService.getCapteurHistory(sensor.id).subscribe({
      next: (historyJson) => {
        try {
          if (historyJson) {
            this.selectedHistorySensor!.history = JSON.parse(historyJson) as HistoryEntry[];
          } else {
            this.selectedHistorySensor!.history = [];
          }
        } catch (e) {
          console.error('Error parsing history', e);
          this.selectedHistorySensor!.history = [];
          this.showAlert('warning', 'Avertissement', 'Impossible de charger l\'historique complet.');
        }
        this.showHistoryModal = true;
      },
      error: (err) => {
        console.error('Failed to load history', err);
        this.selectedHistorySensor!.history = [];
        this.showAlert('warning', 'Avertissement', 'Impossible de charger l\'historique.');
        this.showHistoryModal = true;
      }
    });
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
    this.selectedHistorySensor = null;
    this.historyComment = '';
    this.editingHistoryIndex = -1;
  }

  addHistoryEntry() {
    if (!this.historyComment.trim() || !this.selectedHistorySensor) {
      return;
    }
    
    const newEntry: HistoryEntry = {
      date: new Date(),
      status: this.selectedHistorySensor.status,
      comment: this.historyComment.trim()
    };
    
    if (!this.selectedHistorySensor.history) {
      this.selectedHistorySensor.history = [];
    }
    
    this.selectedHistorySensor.history.unshift(newEntry);
    this.saveHistory();
    this.historyComment = '';
  }

  editHistoryEntry(index: number) {
    if (!this.selectedHistorySensor?.history) return;
    
    const entry = this.selectedHistorySensor.history[index];
    this.editingHistoryIndex = index;
    this.editingHistoryComment = entry.comment;
    this.editingHistoryStatus = entry.status;
  }

  saveEditedHistoryEntry() {
    if (!this.selectedHistorySensor?.history || this.editingHistoryIndex < 0) return;
    
    this.selectedHistorySensor.history[this.editingHistoryIndex].comment = this.editingHistoryComment;
    this.selectedHistorySensor.history[this.editingHistoryIndex].status = this.editingHistoryStatus;
    
    this.saveHistory();
    this.cancelEditHistoryEntry();
  }

  cancelEditHistoryEntry() {
    this.editingHistoryIndex = -1;
    this.editingHistoryComment = '';
    this.editingHistoryStatus = '';
  }

  deleteHistoryEntry(index: number) {
    if (!this.selectedHistorySensor?.history) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée d\'historique ?')) {
      this.selectedHistorySensor.history.splice(index, 1);
      this.saveHistory();
    }
  }

  saveHistory() {
    if (!this.selectedHistorySensor) return;
    
    const historyJson = JSON.stringify(this.selectedHistorySensor.history);
    this.capteurService.updateCapteurHistory(this.selectedHistorySensor.id, historyJson).subscribe({
      next: () => {
        const sensorIndex = this.sensors.findIndex(s => s.id === this.selectedHistorySensor!.id);
        if (sensorIndex >= 0) {
          this.sensors[sensorIndex].history = [...this.selectedHistorySensor!.history!];
        }
      },
      error: (err) => {
        console.error('Failed to save history', err);
        this.showAlert('danger', 'Erreur', 'Impossible de sauvegarder l\'historique. Veuillez réessayer.');
      }
    });
  }

  // DELETE OPERATIONS
  deleteSensor(id: number) {
    this.sensorIdToDelete = id;
    this.showDeleteConfirmation = true;
  }

  confirmDelete() {
    if (this.sensorIdToDelete === null) {
      this.cancelDelete();
      return;
    }
    
    this.capteurService.deleteCapteur(this.sensorIdToDelete).subscribe({
      next: () => {
        this.sensors = this.sensors.filter(s => s.id !== this.sensorIdToDelete);
        this.showAlert('success', 'Capteur supprimé', 'Le capteur a été supprimé avec succès.');
        this.cancelDelete();
      },
      error: (err) => {
        console.error('Failed to delete sensor', err);
        this.showAlert('danger', 'Erreur', 'Échec de la suppression du capteur. Veuillez réessayer.');
        this.cancelDelete();
      }
    });
  }

  cancelDelete() {
    this.showDeleteConfirmation = false;
    this.sensorIdToDelete = null;
  }

  // MAP OPERATIONS
  initMap() {
    // Clean up existing map if any
    if (this.map) {
      this.map.remove();
    }
    
    try {
      // Create map with error handling
      this.map = L.map('location-map', {
        center: [48.8566, 2.3522], // Paris
        zoom: 13,
        zoomControl: true
      });
      
      // Use a different tile provider if OpenStreetMap fails
      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

      // Set default icon for markers
      Marker.prototype.options.icon = this.defaultIcon;
    
    // Add click handler
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.setMapMarker({ x: e.latlng.lat, y: e.latlng.lng });
    });
    
    this.mapInitialized = true;
    } catch (error) {
      console.error('Error initializing map:', error);
      this.showAlert('danger', 'Erreur', 'Impossible de charger la carte. Veuillez réessayer.');
    }
  }

  setMapMarker(coordinates: { x: number, y: number }) {
    if (!this.map) return;
    
    // Remove existing marker
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }
    
    // Add new marker
    this.marker = L.marker([coordinates.x, coordinates.y]).addTo(this.map);
    
    // Update coordinates
    this.currentSensor.coordinates = coordinates;
    
    // Center map on marker
    this.map.setView([coordinates.x, coordinates.y], this.map.getZoom());
  }

  initViewMap() {
    // Clean up existing map if any
    if (this.viewMap) {
      this.viewMap.remove();
    }
    
    if (!this.selectedSensor?.coordinates) return;
    
    // Create map
    this.viewMap = L.map('view-location-map').setView(
      [this.selectedSensor.coordinates.x, this.selectedSensor.coordinates.y], 
      15
    );
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.viewMap);
    
    // Add marker
    this.viewMarker = L.marker(
      [this.selectedSensor.coordinates.x, this.selectedSensor.coordinates.y]
    ).addTo(this.viewMap);
  }

  // UTILITY FUNCTIONS
  simulateSensorData(id: number) {
    this.capteurService.generateData(id).subscribe({
      next: () => {
        this.showAlert('success', 'Simulation effectuée', 'Données simulées générées avec succès.');
      },
      error: (err) => {
        console.error('Failed to simulate sensor data', err);
        this.showAlert('danger', 'Erreur', 'Échec de la simulation des données. Veuillez réessayer.');
      }
    });
  }

  reconnect() {
    this.loadSensors();
  }

  showAlert(severity: 'success' | 'info' | 'warning' | 'danger', message: string, details: string) {
    const id = Date.now().toString();
    const alert: Alert = { id, severity, message, details };
    
    this.alerts.push(alert);
    
    // Auto-remove after 5 seconds
    alert.timeout = setTimeout(() => {
      this.removeAlert(alert);
    }, 5000);
  }

  removeAlert(alert: Alert) {
    if (alert.timeout) {
      clearTimeout(alert.timeout);
    }
    this.alerts = this.alerts.filter(a => a.id !== alert.id);
  }

  // IMPORT/EXPORT OPERATIONS
  exportToExcel() {
    // Prepare data
    const data = this.sensors.map(sensor => ({
      'Nom': sensor.name,
      'Type': this.getSensorTypeLabel(sensor.type),
      'Localisation': sensor.isMapLocation ? 
        `MAP:${sensor.coordinates?.x},${sensor.coordinates?.y}` : 
        sensor.location,
      'Statut': this.getStatusLabel(sensor.status)
    }));
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Capteurs');
    
    // Generate file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save file
    saveAs(blob, `capteurs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  importFromExcel(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Process data
        let imported = 0;
        let errors = 0;
        
        jsonData.forEach((row: any) => {
          try {
            const sensor = this.getEmptySensor();
            sensor.name = row['Nom'] || '';
            sensor.type = this.getSensorTypeValue(row['Type'] || '');
            
            const location = row['Localisation'] || '';
            if (location.startsWith('MAP:')) {
              sensor.isMapLocation = true;
              const coords = location.substring(4).split(',').map(Number);
              sensor.coordinates = { x: coords[0], y: coords[1] };
            } else {
              sensor.isMapLocation = false;
              sensor.location = location;
            }
            
            sensor.status = this.getStatusValue(row['Statut'] || '');
            
            const capteur = this.mapSensorToCapteur(sensor);
            this.capteurService.createCapteur(capteur).subscribe({
              next: () => {
                imported++;
                if (imported + errors === jsonData.length) {
                  this.loadSensors();
                  this.showAlert('success', 'Import réussi', `${imported} capteurs importés, ${errors} erreurs.`);
                }
              },
              error: () => {
                errors++;
                if (imported + errors === jsonData.length) {
                  this.loadSensors();
                  this.showAlert('warning', 'Import terminé avec des erreurs', `${imported} capteurs importés, ${errors} erreurs.`);
                }
              }
            });
          } catch (e) {
            errors++;
            console.error('Error processing row', e);
          }
        });
      } catch (e) {
        console.error('Error importing Excel file', e);
        this.showAlert('danger', 'Erreur d\'import', 'Le fichier importé n\'est pas dans un format valide.');
      }
      
      // Reset file input
      (event.target as HTMLInputElement).value = '';
    };
    
    reader.readAsArrayBuffer(file);
  }

  // HELPER FUNCTIONS
  getSensorTypeLabel(type: string): string {
    switch(type) {
      case 'temperature': return 'Capteur de température';
      case 'humidity': return 'Capteur d\'humidité';
      case 'air_quality': return 'Capteur de qualité de l\'air';
      default: return type;
    }
  }
  
  getSensorTypeValue(label: string): string {
    switch(label) {
      case 'Capteur de température': return 'temperature';
      case 'Capteur d\'humidité': return 'humidity';
      case 'Capteur de qualité de l\'air': return 'air_quality';
      default: return 'temperature';
    }
  }
  
  getStatusLabel(status: string): string {
    switch(status) {
      case 'actif': return 'Actif';
      case 'inactif': return 'Inactif';
      case 'maintenance': return 'Maintenance';
      default: return status;
    }
  }
  
  getStatusValue(label: string): string {
    switch(label) {
      case 'Actif': return 'actif';
      case 'Inactif': return 'inactif';
      case 'Maintenance': return 'maintenance';
      default: return 'actif';
    }
  }

  private initializeLeafletMap(): void {
    try {
      this.mapLoading = true;
      this.mapLoadAttempts++;

      // Vérifier si Leaflet est disponible
      if (typeof L === 'undefined') {
        console.error('Leaflet is not loaded');
        this.showAlert('danger', 'Erreur', 'La bibliothèque Leaflet n\'est pas chargée');
        this.mapLoading = false;
        return;
      }

      // Attendre que l'élément de la carte soit disponible dans le DOM
      const mapElement = document.getElementById('location-map');
      if (!mapElement) {
        console.error('Map element not found');
        if (this.mapLoadAttempts < this.MAX_MAP_LOAD_ATTEMPTS) {
          setTimeout(() => this.initializeLeafletMap(), 500);
          return;
        }
        this.showAlert('danger', 'Erreur', 'Élément de carte non trouvé. Veuillez réessayer.');
        this.mapLoading = false;
        return;
      }

      // Nettoyer la carte existante si elle existe
      if (this.map) {
        this.map.remove();
        this.map = null;
      }

      // Initialiser la carte avec des options de base
      this.map = L.map('location-map', {
        center: [46.603354, 1.888334],
        zoom: 6,
        zoomControl: true,
        attributionControl: true
      });

      // Ajouter les tuiles avec gestion d'erreur
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      });

      tileLayer.addTo(this.map)
        .on('tileerror', () => {
          console.error('Error loading map tiles');
          this.showAlert('warning', 'Attention', 'Problème de chargement des tuiles de la carte. Vérifiez votre connexion internet.');
        })
        .on('load', () => {
          console.log('Map tiles loaded successfully');
          this.mapLoading = false;
        });

      // Configurer l'icône par défaut avec gestion d'erreur
      const defaultIcon = L.icon({
        iconUrl: '/assets/images/marker-icon.png',
        shadowUrl: '/assets/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Ajouter le gestionnaire de clic avec vérification de la carte
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        if (!this.map) return;
        
        if (this.marker) {
          this.map.removeLayer(this.marker);
        }
        
        this.marker = L.marker(e.latlng, { icon: defaultIcon }).addTo(this.map);
        this.currentSensor.coordinates = {
          x: e.latlng.lat,
          y: e.latlng.lng
        };
      });

      // Forcer un rafraîchissement de la carte
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          this.mapLoading = false;
        }
      }, 100);

      this.mapInitialized = true;
      console.log('Map initialized successfully');

    } catch (error) {
      console.error('Error initializing map:', error);
      this.showAlert('danger', 'Erreur', 'Impossible d\'initialiser la carte. Veuillez réessayer.');
      this.mapInitialized = false;
      this.mapLoading = false;

      // Réessayer si nous n'avons pas atteint le nombre maximum de tentatives
      if (this.mapLoadAttempts < this.MAX_MAP_LOAD_ATTEMPTS) {
        setTimeout(() => this.initializeLeafletMap(), 1000);
      }
    }
  }

  // Ajouter une méthode pour vérifier l'état de la carte
  isMapLoading(): boolean {
    return this.mapLoading;
  }

  // Ajouter une méthode pour réinitialiser la carte
  resetMap() {
    this.mapLoading = true;
    this.mapLoadAttempts = 0;
    this.initializeLeafletMap();
  }

  onCarteSelected() {
    setTimeout(() => this.initializeLeafletMap(), 100);
  }
}