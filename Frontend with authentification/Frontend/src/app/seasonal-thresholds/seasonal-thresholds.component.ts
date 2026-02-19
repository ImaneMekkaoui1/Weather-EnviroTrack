import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// Normes de référence pour le Maroc (NAAQS)
interface SeasonThresholds {
  season: string;
  aqi: { min: number; max: number; normal: string };
  pm25: { min: number; max: number; normal: string };
  pm10: { min: number; max: number; normal: string };
  no2: { min: number; max: number; normal: string };
  o3: { min: number; max: number; normal: string };
  co: { min: number; max: number; normal: string };
  temperature: { min: number; max: number; normal: string };
  humidity: { min: number; max: number; normal: string };
}

@Component({
  selector: 'app-seasonal-thresholds',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './seasonal-thresholds.component.html',
  styleUrls: ['./seasonal-thresholds.component.css']
})
export class SeasonalThresholdsComponent implements OnInit {
  seasons = ['Hiver', 'Printemps', 'Été', 'Automne'];
  currentSeason = this.getCurrentSeason();
  thresholdForm: FormGroup;

  // Valeurs de référence pour le Maroc selon les normes nationales
  defaultThresholds: SeasonThresholds[] = [
    {
      season: 'Hiver',
      aqi: { min: 0, max: 50, normal: '0-50 (Bon)' },
      pm25: { min: 0, max: 25, normal: '≤ 25 µg/m³ (Norme Maroc)' },
      pm10: { min: 0, max: 50, normal: '≤ 50 µg/m³ (Norme Maroc)' },
      no2: { min: 0, max: 100, normal: '≤ 100 µg/m³ (Norme Maroc)' },
      o3: { min: 0, max: 100, normal: '≤ 100 µg/m³ (8h)' },
      co: { min: 0, max: 5, normal: '≤ 5 ppm (8h)' },
      temperature: { min: 5, max: 20, normal: '5-20°C (Typique)' },
      humidity: { min: 40, max: 80, normal: '40-80% (Hiver)' }
    },
    {
      season: 'Printemps',
      aqi: { min: 0, max: 50, normal: '0-50 (Bon)' },
      pm25: { min: 0, max: 35, normal: '≤ 35 µg/m³ (Sable Saharien)' },
      pm10: { min: 0, max: 70, normal: '≤ 70 µg/m³ (Sable Saharien)' },
      no2: { min: 0, max: 90, normal: '≤ 90 µg/m³' },
      o3: { min: 0, max: 110, normal: '≤ 110 µg/m³ (8h)' },
      co: { min: 0, max: 4.5, normal: '≤ 4.5 ppm' },
      temperature: { min: 15, max: 28, normal: '15-28°C (Typique)' },
      humidity: { min: 35, max: 70, normal: '35-70%' }
    },
    {
      season: 'Été',
      aqi: { min: 0, max: 100, normal: '50-100 (Modéré)' },
      pm25: { min: 0, max: 45, normal: '≤ 45 µg/m³ (Pics sahariens)' },
      pm10: { min: 0, max: 100, normal: '≤ 100 µg/m³ (Pics sahariens)' },
      no2: { min: 0, max: 85, normal: '≤ 85 µg/m³' },
      o3: { min: 0, max: 120, normal: '≤ 120 µg/m³ (8h)' },
      co: { min: 0, max: 4, normal: '≤ 4 ppm' },
      temperature: { min: 22, max: 38, normal: '22-38°C (Typique)' },
      humidity: { min: 20, max: 60, normal: '20-60% (Côtier plus humide)' }
    },
    {
      season: 'Automne',
      aqi: { min: 0, max: 75, normal: '0-75 (Acceptable)' },
      pm25: { min: 0, max: 30, normal: '≤ 30 µg/m³' },
      pm10: { min: 0, max: 60, normal: '≤ 60 µg/m³' },
      no2: { min: 0, max: 95, normal: '≤ 95 µg/m³' },
      o3: { min: 0, max: 105, normal: '≤ 105 µg/m³ (8h)' },
      co: { min: 0, max: 4.8, normal: '≤ 4.8 ppm' },
      temperature: { min: 18, max: 30, normal: '18-30°C (Typique)' },
      humidity: { min: 30, max: 75, normal: '30-75%' }
    }
  ];

  constructor(private fb: FormBuilder) {
    this.thresholdForm = this.fb.group({
      thresholds: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadThresholds();
  }


  get thresholds(): FormArray {
    return this.thresholdForm.get('thresholds') as FormArray;
  }

  loadThresholds(): void {
    this.defaultThresholds.forEach(seasonData => {
      this.thresholds.push(this.createSeasonThresholdGroup(seasonData));
    });
  }

  createSeasonThresholdGroup(seasonData: SeasonThresholds): FormGroup {
    return this.fb.group({
      season: [seasonData.season, Validators.required],
      aqi: this.fb.group({
        min: [seasonData.aqi.min, [Validators.required, Validators.min(0)]],
        max: [seasonData.aqi.max, [Validators.required, Validators.min(0)]]
      }),
      pm25: this.fb.group({
        min: [seasonData.pm25.min, [Validators.required, Validators.min(0)]],
        max: [seasonData.pm25.max, [Validators.required, Validators.min(0)]]
      }),
      pm10: this.fb.group({
        min: [seasonData.pm10.min, [Validators.required, Validators.min(0)]],
        max: [seasonData.pm10.max, [Validators.required, Validators.min(0)]]
      }),
      no2: this.fb.group({
        min: [seasonData.no2.min, [Validators.required, Validators.min(0)]],
        max: [seasonData.no2.max, [Validators.required, Validators.min(0)]]
      }),
      o3: this.fb.group({
        min: [seasonData.o3.min, [Validators.required, Validators.min(0)]],
        max: [seasonData.o3.max, [Validators.required, Validators.min(0)]]
      }),
      co: this.fb.group({
        min: [seasonData.co.min, [Validators.required, Validators.min(0)]],
        max: [seasonData.co.max, [Validators.required, Validators.min(0)]]
      }),
      temperature: this.fb.group({
        min: [seasonData.temperature.min, Validators.required],
        max: [seasonData.temperature.max, Validators.required]
      }),
      humidity: this.fb.group({
        min: [seasonData.humidity.min, [Validators.required, Validators.min(0), Validators.max(100)]],
        max: [seasonData.humidity.max, [Validators.required, Validators.min(0), Validators.max(100)]]
      })
    });
  }

  onSubmit(): void {
    if (this.thresholdForm.valid) {
      console.log('Thresholds saved:', this.thresholdForm.value);
      // Ici vous pourriez envoyer les données à votre service MQTT ou API
      alert('Seuils saisonniers sauvegardés avec succès!');
    } else {
      alert('Veuillez corriger les erreurs dans le formulaire.');
    }
  }

  getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Printemps';
    if (month >= 6 && month <= 8) return 'Été';
    if (month >= 9 && month <= 11) return 'Automne';
    return 'Hiver';
  }

  getCurrentSeasonThresholds(): SeasonThresholds | undefined {
    return this.defaultThresholds.find(t => t.season === this.currentSeason);
  }
}