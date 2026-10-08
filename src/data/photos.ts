/**
 * Photos of real Greenville places, from Wikimedia Commons. Every one is
 * openly licensed; the About page lists the credits (author, license, source),
 * which CC BY and CC BY-SA require. Banners are cropped, which is noted there.
 *
 * Rules: places, not people in crisis. Add a new photo here with its full
 * credit before using it anywhere.
 */
import type { ImageMetadata } from 'astro';
import homeLibertyBridge from '../assets/photos/home-liberty-bridge.jpg';
import housingPorch from '../assets/photos/housing-porch.jpg';
import foodSaturdayMarket from '../assets/photos/food-saturday-market.jpg';
import medicalGardens from '../assets/photos/medical-falls-park-gardens.jpg';
import mentalHealthBench from '../assets/photos/mental-health-river-bench.jpg';
import financialMainStreet from '../assets/photos/financial-main-street-bridge.jpg';
import legalCourthouse from '../assets/photos/legal-county-courthouse.jpg';
import transportationBus from '../assets/photos/transportation-bus.jpg';
import reentryLibertyBridge from '../assets/photos/reentry-liberty-bridge.jpg';
import veteransReedyRiver from '../assets/photos/veterans-reedy-river.jpg';
import youthSwampRabbit from '../assets/photos/youth-swamp-rabbit-trail.jpg';
import familyFallsPark from '../assets/photos/family-falls-park.jpg';
import educationLibrary from '../assets/photos/education-hughes-library.jpg';
import communityFallsPark from '../assets/photos/community-falls-park-scene.jpg';
import aboutReedyFalls from '../assets/photos/about-reedy-river-falls.jpg';

export interface Photo {
  src: ImageMetadata;
  alt: string;
  /** Short place name shown under the photo. */
  place: string;
  author: string;
  license: string;
  licenseUrl: string;
  /** Wikimedia Commons file page. */
  source: string;
}

const CC_BY = { license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' };
const CC_BY_SA = { license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };
const CC0 = { license: 'CC0 (public domain)', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' };
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;

export const PHOTOS = {
  home: {
    src: homeLibertyBridge,
    alt: 'The Reedy River falls under the Liberty Bridge in Falls Park, with downtown Greenville behind it',
    place: 'Liberty Bridge, Falls Park on the Reedy',
    author: 'P. Hughes',
    ...CC_BY_SA,
    source: commons('Greenville - Liberty Bridge at Falls Park.jpg'),
  },
  housing: {
    src: housingPorch,
    alt: "A house with a deep front porch in Greenville's Hampton-Pinckney neighborhood",
    place: 'Hampton-Pinckney, Greenville',
    author: 'P. Hughes',
    ...CC_BY,
    source: commons('Greenville - Hampton-Pinckney Historic District 5.jpg'),
  },
  food: {
    src: foodSaturdayMarket,
    alt: 'People walking between market tents under the trees on Main Street at the Saturday Market',
    place: 'Saturday Market, Main Street',
    author: 'Thomson200',
    ...CC0,
    source: commons('Greenville Saturday Market, June 2019 1.jpg'),
  },
  medical: {
    src: medicalGardens,
    alt: 'Stone steps and flower beds curving around a lawn in Falls Park',
    place: 'Gardens at Falls Park on the Reedy',
    author: 'P. Hughes',
    ...CC_BY,
    source: commons('Greenville - Gardens, Reedy River Falls Park.jpg'),
  },
  'mental-health': {
    src: mentalHealthBench,
    alt: 'Benches along a quiet path beside the Reedy River in Falls Park',
    place: 'Along the Reedy River, Falls Park',
    author: 'P. Hughes',
    ...CC_BY,
    source: commons('Greenville - Reedy River Falls Park Bench.jpg'),
  },
  financial: {
    src: financialMainStreet,
    alt: 'The Main Street bridge over the Reedy River in downtown Greenville',
    place: 'Main Street bridge, downtown Greenville',
    author: 'P. Hughes',
    ...CC_BY,
    source: commons('Greenville - Main Street Bridge and Office building.jpg'),
  },
  legal: {
    src: legalCourthouse,
    alt: 'The brick Greenville County Courthouse under a clear sky',
    place: 'Greenville County Courthouse',
    author: 'P. Hughes',
    ...CC_BY,
    source: commons('Greenville - Greenville County Courthouse 01.jpg'),
  },
  transportation: {
    src: transportationBus,
    alt: 'An electric city bus on a street in downtown Greenville',
    place: 'A city bus downtown',
    author: 'Greenville Daily Photo',
    ...CC0,
    source: commons('Proterra.jpg'),
  },
  reentry: {
    src: reentryLibertyBridge,
    alt: 'The curved walkway of the Liberty Bridge, leading across the Reedy River into the trees',
    place: 'Liberty Bridge, Falls Park on the Reedy',
    author: 'DXR',
    ...CC_BY_SA,
    source: commons('Liberty Bridge, Falls Park on the Reedy, Greenville SC 20160701 2.jpg'),
  },
  veterans: {
    src: veteransReedyRiver,
    alt: 'The Reedy River running over rocks below downtown Greenville',
    place: 'Reedy River, Falls Park',
    author: 'P. Hughes',
    ...CC_BY_SA,
    source: commons('Greenville - Reedy River, Falls Park.jpg'),
  },
  youth: {
    src: youthSwampRabbit,
    alt: 'The Swamp Rabbit Trail running under green trees toward a footbridge',
    place: 'Swamp Rabbit Trail',
    author: 'Thomson200',
    ...CC0,
    source: commons('Swamp Rabbit Trail, Greenville, SC June 2019.jpg'),
  },
  family: {
    src: familyFallsPark,
    alt: 'Paths and open lawn under tall trees in Falls Park',
    place: 'Falls Park on the Reedy',
    author: 'P. Hughes',
    ...CC_BY_SA,
    source: commons('Greenville - Falls Park.jpg'),
  },
  education: {
    src: educationLibrary,
    alt: 'The curved brick front of the Hughes Main Library',
    place: 'Hughes Main Library',
    author: 'P. Hughes',
    ...CC_BY,
    source: commons('Greenville - Hughes Main Library 01.jpg'),
  },
  community: {
    src: communityFallsPark,
    alt: 'A small waterfall under a stone footbridge in Falls Park, seen through the trees',
    place: 'Falls Park on the Reedy',
    author: 'P. Hughes',
    ...CC_BY_SA,
    source: commons('Greenville - Falls Park scene.jpg'),
  },
  about: {
    src: aboutReedyFalls,
    alt: 'The Reedy River falls over wide rocks in Falls Park, with trees and a footpath above',
    place: 'Reedy River Falls',
    author: 'P. Hughes',
    ...CC_BY_SA,
    source: commons('Greenville - Reedy River Falls 3.jpg'),
  },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;
export const photoFor = (key: string): Photo | undefined => PHOTOS[key as PhotoKey];
