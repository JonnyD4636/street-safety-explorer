import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; 

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
})
export class LandingPage {
  creatorName = 'Jonny D.';
}