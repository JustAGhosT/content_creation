/**
 * Aerospace & Counter-Drone Campaign
 * Month 1: 30 Days × 3 Posts/Day = 90 Posts
 */

import { Campaign, CampaignContent, CampaignContentType } from '@/types/campaign';
import { AEROSPACE_SERIES_ID } from './aerospace-series';

export const AEROSPACE_CAMPAIGN_ID = 'campaign_aerospace_month1_001';

// Helper to create content item
function createPost(
  day: number,
  postNum: number,
  title: string,
  body: string,
  hashtags: string[]
): CampaignContent {
  const timeSlots = ['09:00', '14:00', '18:00'];
  const baseDate = new Date('2025-12-01');
  baseDate.setDate(baseDate.getDate() + day - 1);

  return {
    id: `content_aero_d${day}_p${postNum}`,
    type: 'standalone' as CampaignContentType,
    sourceId: AEROSPACE_SERIES_ID,
    sourceType: 'series',
    title,
    body,
    summary: title,
    adaptations: [
      {
        variantId: `variant_aero_d${day}_p${postNum}_twitter`,
        platformId: 'twitter',
        platformName: 'Twitter',
        content: body,
        hashtags,
        scheduledTime: `${baseDate.toISOString().split('T')[0]}T${timeSlots[postNum - 1]}:00Z`,
        status: 'pending',
      },
      {
        variantId: `variant_aero_d${day}_p${postNum}_linkedin`,
        platformId: 'linkedin',
        platformName: 'LinkedIn',
        content: body.replaceAll('\n', '\n\n'), // More spacing for LinkedIn
        hashtags: hashtags.slice(0, 3), // Fewer hashtags for LinkedIn
        scheduledTime: `${baseDate.toISOString().split('T')[0]}T${timeSlots[postNum - 1]}:00Z`,
        status: 'pending',
      },
    ],
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
  };
}

// All 90 posts organized by day
export const aerospaceCampaignPosts: CampaignContent[] = [
  // Day 1: Campaign Launch & Introduction
  createPost(
    1,
    1,
    'Campaign Launch - Counter-Drone Deep Dive',
    `Launching our deep dive into counter-drone technology and aerospace security.

Over the next 30 days, we'll explore how organizations protect critical airspace from unauthorized UAVs.

Follow along for insights into the tech securing our skies.`,
    ['CounterUAS', 'DroneDefense', 'AerospaceSecurity']
  ),
  createPost(
    1,
    2,
    'Understanding the Counter-UAS Kill Chain',
    `Understanding the Counter-UAS Kill Chain:

1. DETECT - Identify drone presence
2. TRACK - Monitor flight path
3. IDENTIFY - Classify threat level
4. MITIGATE - Neutralize if necessary

Each step requires different technologies working in concert.`,
    ['DroneDetection', 'SecurityTech']
  ),
  createPost(
    1,
    3,
    'Why Counter-Drone Technology Matters',
    `Why counter-drone technology matters:

• Protects critical infrastructure
• Ensures aviation safety
• Prevents industrial espionage
• Stops contraband delivery
• Maintains privacy boundaries

The invisible shield protecting modern society.`,
    ['CriticalInfrastructure', 'DroneThreats']
  ),

  // Day 2: Detection Technologies
  createPost(
    2,
    1,
    'Radio Frequency (RF) Detection Explained',
    `Radio Frequency (RF) Detection Explained:

Most drones communicate on 2.4GHz or 5.8GHz frequencies. RF sensors detect these signals from up to 10km away, identifying both the drone AND the operator's location.

Key advantage: Works in all weather conditions.`,
    ['RFDetection', 'TechExplained']
  ),
  createPost(
    2,
    2,
    'Radar for Drone Detection',
    `Radar for Drone Detection: Not Your Grandfather's Technology

Modern 3D radars can detect objects as small as a sparrow. Using Doppler shift, they distinguish drone propeller signatures from birds.

Challenge: Expensive, but unmatched for tracking multiple targets.`,
    ['RadarTechnology', 'DroneTracking']
  ),
  createPost(
    2,
    3,
    'Detection Tech Comparison',
    `Detection Tech Comparison:

RF Sensors: Best for communication-based drones
Radar: Ideal for all drones including autonomous
Acoustic: Good for close-range in quiet environments
Optical/IR: Excellent for identification

Each has strengths—integration is key.`,
    ['CounterDrone', 'TechStack']
  ),

  // Day 3: Identification & Tracking
  createPost(
    3,
    1,
    'The Identification Challenge',
    `The Identification Challenge:

Is it a bird? A drone? A plastic bag?

Modern AI systems analyze:
• Movement patterns
• Heat signatures
• Acoustic profiles
• RF fingerprints

Machine learning reduces false positives by up to 95%.`,
    ['AI', 'MachineLearning', 'DroneID']
  ),
  createPost(
    3,
    2,
    'Computer Vision in Counter-UAS',
    `Computer Vision in Counter-UAS:

High-res cameras + AI algorithms can:
• Identify drone make/model
• Detect payload presence
• Track multiple targets
• Work day/night with IR

Processing time: <100ms per frame

The eye in the sky that never blinks.`,
    ['ComputerVision', 'AIDetection']
  ),
  createPost(
    3,
    3,
    'Multi-Sensor Fusion Tracking',
    `How do you track a drone in a crowded airspace?

Multi-sensor fusion combines:
• Radar plots
• Camera feeds
• RF triangulation
• Acoustic bearing

Creates a unified track with position accuracy within 5 meters at 1km range.`,
    ['SensorFusion', 'Tracking']
  ),

  // Day 4: Mitigation Technologies
  createPost(
    4,
    1,
    'Electronic Warfare - The Invisible Defense',
    `Electronic Warfare: The Invisible Defense

RF Jamming disrupts the control link between drone and operator. When jammed, most drones:
• Return to home
• Land immediately
• Hover in place

Effective range: 500m to 5km
Success rate: High for commercial drones`,
    ['EW', 'Jamming', 'DroneDefense']
  ),
  createPost(
    4,
    2,
    'GPS Spoofing - Redirecting the Unwanted',
    `GPS Spoofing: Redirecting the Unwanted

By broadcasting false GPS signals, systems can:
• Make drones think they're in restricted airspace
• Guide them to safe landing zones
• Trigger geofencing restrictions

Precision matters—one miscalculation affects all GPS devices nearby.`,
    ['GPSSpoofing', 'CounterUAS']
  ),
  createPost(
    4,
    3,
    'Physical Capture Systems',
    `Physical Capture Systems:

Net guns, net drones, and tethered capture systems physically snare targets.

Advantages:
• Preserves evidence
• No electronic interference
• Works on autonomous drones

Challenge: Limited range, typically <100m`,
    ['DroneCapture', 'KineticDefense']
  ),

  // Day 5: Directed Energy Systems
  createPost(
    5,
    1,
    'High-Power Microwave (HPM) Systems',
    `High-Power Microwave (HPM) Systems:

Directed energy that disrupts drone electronics without visible damage.

• Range: Up to 1km
• Effect: Immediate system failure
• Advantage: Instant, repeatable
• Challenge: Collateral electronics risk

The future is electromagnetic.`,
    ['DirectedEnergy', 'HPM']
  ),
  createPost(
    5,
    2,
    'Laser Systems for Counter-UAS',
    `Laser Systems for Counter-UAS:

High-energy lasers can:
• Burn through drone components
• Disable cameras/sensors
• Cut control surfaces

Speed of light engagement, near-zero cost per shot.
Currently operational at select military sites.`,
    ['LaserWeapons', 'DEW']
  ),
  createPost(
    5,
    3,
    'Directed Energy Pros & Cons',
    `Directed Energy Pros & Cons:

PROS:
• Instant effect
• Low cost per engagement
• Deep magazine (unlimited shots)

CONS:
• Weather dependent (lasers)
• Power requirements
• Safety zones needed

Revolutionary but not universal.`,
    ['DirectedEnergy', 'TechAnalysis']
  ),

  // Day 6: Integration & Command Systems
  createPost(
    6,
    1,
    'Command & Control (C2) Systems',
    `Command & Control (C2) Systems:

The brain of counter-drone operations, integrating:
• Multiple sensor feeds
• Threat assessment algorithms
• Response recommendations
• Operator interfaces

Modern C2 reduces decision time from minutes to seconds.`,
    ['C2Systems', 'Integration']
  ),
  createPost(
    6,
    2,
    'The Power of Integration',
    `The Power of Integration:

Single-point solutions fail against sophisticated threats. Layered defense combines:

Layer 1: Long-range detection (radar)
Layer 2: Identification (EO/IR cameras)
Layer 3: Confirmation (RF sensors)
Layer 4: Mitigation (selected response)`,
    ['LayeredDefense', 'SystemIntegration']
  ),
  createPost(
    6,
    3,
    'Real-Time Data Fusion',
    `Real-Time Data Fusion:

Modern systems process:
• 100+ radar tracks/second
• 50+ video streams
• 1000+ RF signals
• Weather data
• Flight databases

All synthesized into a single operational picture in milliseconds.`,
    ['DataFusion', 'RealTime']
  ),

  // Day 7: Airport Applications
  createPost(
    7,
    1,
    'Airports - The Front Line',
    `Airports: The Front Line of Counter-UAS

A single drone incursion can:
• Close runways for hours
• Delay hundreds of flights
• Cost millions in losses
• Risk passenger safety

That's why airports lead counter-drone adoption.`,
    ['AirportSecurity', 'Aviation']
  ),
  createPost(
    7,
    2,
    'Airport Counter-Drone Challenges',
    `Airport Counter-Drone Challenges:

• Dense RF environment
• Can't jam (interferes with aircraft)
• Multiple approach vectors
• High consequences for mistakes
• 24/7 operation requirement

Solutions must be precise and reliable.`,
    ['AviationSafety', 'Challenges']
  ),
  createPost(
    7,
    3,
    'Best Practices for Airport C-UAS',
    `Best Practices for Airport C-UAS:

1. Multi-layered detection perimeter
2. Passive detection prioritized
3. Trained response teams
4. Clear escalation procedures
5. Integration with ATC systems

Safety first, always.`,
    ['BestPractices', 'AirportOps']
  ),

  // Day 8: Critical Infrastructure Protection
  createPost(
    8,
    1,
    'Protecting Critical Infrastructure',
    `Protecting Critical Infrastructure:

Power plants, water facilities, and data centers face unique drone threats:
• Surveillance/reconnaissance
• Physical damage
• Cyber payload delivery
• Service disruption

Each facility needs tailored protection.`,
    ['InfrastructureProtection', 'Security']
  ),
  createPost(
    8,
    2,
    'Nuclear Facility Drone Defense',
    `Nuclear Facility Drone Defense:

Requirements:
• Detection at 5+ km
• Zero false negatives
• Immediate response capability
• Radiation-hardened equipment
• Integration with existing security

The highest stakes demand the best technology.`,
    ['NuclearSecurity', 'CriticalAssets']
  ),
  createPost(
    8,
    3,
    'Water Infrastructure Security',
    `Water Infrastructure: An Overlooked Target

Drones could:
• Map facility layouts
• Deliver contaminants
• Damage equipment
• Disrupt operations

Yet many water facilities lack basic counter-drone capabilities.

Time to close this gap.`,
    ['WaterSecurity', 'Infrastructure']
  ),

  // Day 9: Prison & Correctional Facilities
  createPost(
    9,
    1,
    'The Prison Contraband Problem',
    `The Prison Contraband Problem:

Drones deliver:
• Drugs
• Weapons
• Cell phones
• Escape tools

Some facilities report multiple attempts weekly. Traditional security can't look up.`,
    ['PrisonSecurity', 'Contraband']
  ),
  createPost(
    9,
    2,
    'Prison-Specific C-UAS Requirements',
    `Prison-Specific C-UAS Requirements:

• Continuous 360° coverage
• Immediate alert capability
• Evidence preservation
• Integration with existing systems
• Legal intercept authority

Stopping drops while maintaining safety.`,
    ['CorrectionalSecurity', 'DroneDefense']
  ),
  createPost(
    9,
    3,
    'ROI of Prison Counter-Drone Systems',
    `ROI of Prison Counter-Drone Systems:

Cost of one successful contraband delivery:
• Security response
• Investigation
• Potential violence
• Legal proceedings

Often exceeds entire C-UAS system cost. Prevention pays dividends.`,
    ['SecurityROI', 'CostBenefit']
  ),

  // Day 10: Military & Defense Applications
  createPost(
    10,
    1,
    'Military Counter-UAS Evolution',
    `Military Counter-UAS Evolution:

From hobbyist quadcopters with grenades to AI-powered swarms, the battlefield has changed.

Modern military C-UAS must counter:
• ISR drones
• Loitering munitions
• Swarm attacks
• Autonomous systems

Adaptation is survival.`,
    ['MilitaryTech', 'Defense']
  ),
  createPost(
    10,
    2,
    'Force Protection Priorities',
    `Force Protection Priorities:

Mobile military units need:
• Portable C-UAS systems
• 360° coverage on the move
• Multi-threat capability
• Minimal setup time
• Integration with existing defense

Every vehicle a potential target, every unit needs protection.`,
    ['ForceProtection', 'Military']
  ),
  createPost(
    10,
    3,
    'Lessons from Recent Conflicts',
    `Lessons from Recent Conflicts:

Counter-UAS is no longer optional in modern warfare. Key observations:

• Small drones as effective as missiles
• Cost asymmetry favors attackers
• Electronic warfare crucial
• Kinetic options necessary

Doctrine must evolve.`,
    ['MilitaryLessons', 'ModernWarfare']
  ),

  // Day 11: Border & Perimeter Security
  createPost(
    11,
    1,
    'Border Security Challenge',
    `Border Security Challenge:

Drones easily bypass traditional barriers:
• Fly over walls
• Avoid ground sensors
• Operate at night
• Cover vast distances

Securing thousands of miles requires smart, scalable solutions.`,
    ['BorderSecurity', 'DroneDetection']
  ),
  createPost(
    11,
    2,
    'Perimeter Protection Strategy',
    `Perimeter Protection Strategy:

Effective border C-UAS uses:
• Long-range radar networks
• Automated threat classification
• Mobile response units
• Persistent surveillance
• Regional command centers

Technology multiplies human capability.`,
    ['PerimeterSecurity', 'Technology']
  ),
  createPost(
    11,
    3,
    'Geographic Challenges',
    `Geographic Challenges:

Desert: Heat affects sensors
Mountains: Terrain blocks radar
Coastal: Salt degrades equipment
Urban: RF interference
Forest: Limited sight lines

Each environment demands adapted solutions.`,
    ['Geography', 'SecurityChallenges']
  ),

  // Day 12: Regulatory Framework
  createPost(
    12,
    1,
    'The Regulatory Challenge',
    `The Regulatory Challenge:

Counter-drone operations must balance:
• Security needs
• Privacy rights
• Aviation safety
• Communications law
• Property rights

Getting it right requires careful framework design.`,
    ['Regulation', 'LegalFramework']
  ),
  createPost(
    12,
    2,
    'Key Regulatory Considerations',
    `Key Regulatory Considerations:

• Who can deploy C-UAS?
• What mitigation methods are legal?
• When can systems engage?
• Where is deployment authorized?
• How is data handled?

Clear rules enable effective protection.`,
    ['Compliance', 'Regulations']
  ),
  createPost(
    12,
    3,
    'International Regulatory Variations',
    `International Regulatory Variations:

USA: Federal authority primary
EU: Strict privacy requirements
Asia: Varied by country
Middle East: Security prioritized

Global operations need local expertise.`,
    ['GlobalRegulations', 'Compliance']
  ),

  // Day 13: Privacy & Ethical Considerations
  createPost(
    13,
    1,
    'Privacy in Counter-Drone Operations',
    `Privacy in Counter-Drone Operations:

Detection systems may inadvertently:
• Capture bystander data
• Record legitimate aircraft
• Monitor communications
• Track individuals

Responsible deployment protects both security AND privacy.`,
    ['Privacy', 'Ethics']
  ),
  createPost(
    13,
    2,
    'Ethical Use Framework',
    `Ethical Use Framework:

• Proportional response
• Minimal data collection
• Clear retention policies
• Transparent deployment
• Regular audits

Security without surveillance overreach.`,
    ['EthicalTech', 'Responsibility']
  ),
  createPost(
    13,
    3,
    'Balancing Security and Privacy',
    `Balancing Act:

Security vs Privacy isn't zero-sum. Best practices:
• Anonymous detection when possible
• Data minimization
• Purpose limitation
• Access controls
• Regular deletion

Protecting people, not surveilling them.`,
    ['PrivacyFirst', 'Security']
  ),

  // Day 14: Training & Procedures
  createPost(
    14,
    1,
    'The Human Factor',
    `The Human Factor:

Best technology fails without proper training. Operators need:
• System operation skills
• Threat assessment ability
• Response decision training
• Legal knowledge
• Stress management

People make systems effective.`,
    ['Training', 'HumanFactor']
  ),
  createPost(
    14,
    2,
    'Standard Operating Procedures',
    `Standard Operating Procedures (SOPs):

Essential SOPs include:
• Detection verification
• Threat classification
• Response authorization
• Engagement rules
• Post-incident actions

Clear procedures prevent costly mistakes.`,
    ['SOPs', 'Operations']
  ),
  createPost(
    14,
    3,
    'Training Best Practices',
    `Training Best Practices:

• Regular drills with varied scenarios
• Cross-training on all systems
• Legal/regulatory updates
• Lessons learned reviews
• Stress inoculation

Competence comes from preparation.`,
    ['TrainingExcellence', 'Preparedness']
  ),

  // Day 15: Technology Limitations
  createPost(
    15,
    1,
    'Understanding C-UAS Limitations',
    `Understanding C-UAS Limitations:

No system is perfect:
• Weather impacts performance
• Terrain creates blind spots
• Swarms overwhelm capacity
• Autonomy defeats jamming
• Size challenges detection

Honest assessment improves security.`,
    ['TechLimitations', 'Reality']
  ),
  createPost(
    15,
    2,
    'The Small Drone Problem',
    `The Small Drone Problem:

Micro-drones (<250g) challenge detection:
• Minimal radar signature
• Low acoustic profile
• Short communication range
• Blend with birds/debris

Innovation needed for sub-250g threats.`,
    ['MicroDrones', 'Challenges']
  ),
  createPost(
    15,
    3,
    'Environmental Factors',
    `Environmental Factors:

Rain: Reduces laser effectiveness
Fog: Limits optical systems
Wind: Affects acoustic detection
Sun: Blinds cameras
EMI: Interferes with RF

Nature always has a vote.`,
    ['EnvironmentalFactors', 'RealWorld']
  ),

  // Day 16: Cost Considerations
  createPost(
    16,
    1,
    'C-UAS Investment Scales',
    `C-UAS Investment Scales:

Basic: $100K-500K
- Single sensor type
- Limited range
- Manual operation

Advanced: $2M-10M
- Multi-sensor
- Automated
- Integrated response

Cost matches consequence.`,
    ['Investment', 'SecurityBudget']
  ),
  createPost(
    16,
    2,
    'Total Cost of Ownership',
    `Total Cost of Ownership:

Beyond purchase price:
• Installation
• Training
• Maintenance
• Updates
• Operations

TCO often 2-3x initial investment over 5 years.`,
    ['TCO', 'BudgetPlanning']
  ),
  createPost(
    16,
    3,
    'Cost-Benefit Analysis',
    `Cost-Benefit Analysis:

Calculate:
• Incident probability
• Potential losses
• Mitigation effectiveness
• System costs
• Operational impact

Most facilities find positive ROI within 24 months.`,
    ['ROI', 'BusinessCase']
  ),

  // Day 17: Emerging Threats
  createPost(
    17,
    1,
    'Next-Generation Threats',
    `Next-Generation Threats:

Evolving challenges:
• AI-powered autonomous drones
• Mesh network swarms
• Morphing designs
• Bio-mimetic drones
• Quantum-encrypted controls

Tomorrow's threats need today's innovation.`,
    ['EmergingThreats', 'Future']
  ),
  createPost(
    17,
    2,
    'Swarm Attack Scenarios',
    `Swarm Attack Scenarios:

Coordinated swarms could:
• Overwhelm defenses
• Self-sacrifice to clear paths
• Adapt to countermeasures
• Reform after losses
• Execute complex missions

Current defenses struggle with 10+ simultaneous targets.`,
    ['SwarmThreats', 'Innovation']
  ),
  createPost(
    17,
    3,
    'Autonomous Threat Evolution',
    `Autonomous Threat Evolution:

No RF signature. No GPS dependence. No operator link.

Using onboard AI for:
• Navigation
• Target recognition
• Threat avoidance
• Mission execution

Traditional C-UAS must evolve.`,
    ['AutonomousDrones', 'AI']
  ),

  // Day 18: Success Stories
  createPost(
    18,
    1,
    'Success Story - Major Sporting Event',
    `Success Story: Major Sporting Event

Challenge: Protect 70,000 attendees
Solution: 4-layer C-UAS deployment
Result:
• 23 drones detected
• All neutralized safely
• Zero disruptions
• Flawless event

Preparation prevents problems.`,
    ['SuccessStory', 'EventSecurity']
  ),
  createPost(
    18,
    2,
    'Industrial Site Protection Win',
    `Industrial Site Protection Win:

Oil refinery deployment:
• 24/7 automated monitoring
• 3km detection radius
• Integrated with security ops
• 15 intrusions stopped Year 1

Protecting critical operations.`,
    ['IndustrialSecurity', 'CaseStudy']
  ),
  createPost(
    18,
    3,
    'Government Facility Success',
    `Government Facility Success:

High-profile location implemented:
• Concealed detection network
• Passive monitoring priority
• Rapid response team
• Zero public visibility

Security without disruption.`,
    ['GovernmentSecurity', 'Success']
  ),

  // Day 19: Technology Partnerships
  createPost(
    19,
    1,
    'Why Partnerships Matter',
    `Why Partnerships Matter:

No single company has all solutions. Successful C-UAS requires:
• Sensor manufacturers
• Software developers
• System integrators
• Service providers
• End users

Collaboration drives innovation.`,
    ['Partnerships', 'Collaboration']
  ),
  createPost(
    19,
    2,
    'Integration Partner Selection',
    `Integration Partner Selection:

Key criteria:
• Proven expertise
• Open architecture
• Support capability
• Financial stability
• Innovation pipeline

Choose partners, not just products.`,
    ['PartnerSelection', 'Integration']
  ),
  createPost(
    19,
    3,
    'The Ecosystem Approach',
    `The Ecosystem Approach:

Best-in-class solutions combine:
• Leading detection hardware
• Advanced analytics software
• Professional services
• Ongoing support
• Continuous updates

Ecosystem > Single vendor`,
    ['Ecosystem', 'Technology']
  ),

  // Day 20: Data & Analytics
  createPost(
    20,
    1,
    'The Data Opportunity',
    `The Data Opportunity:

C-UAS systems generate massive data:
• Detection patterns
• Drone characteristics
• Flight paths
• Response effectiveness
• System performance

Mining this data improves security.`,
    ['DataAnalytics', 'Intelligence']
  ),
  createPost(
    20,
    2,
    'Predictive Analytics in C-UAS',
    `Predictive Analytics in C-UAS:

Machine learning identifies:
• Peak threat times
• Common approach routes
• Operator patterns
• Equipment preferences
• Evolving tactics

From reactive to predictive security.`,
    ['PredictiveAnalytics', 'ML']
  ),
  createPost(
    20,
    3,
    'Performance Metrics That Matter',
    `Performance Metrics That Matter:

Track:
• Detection rate
• False positive rate
• Response time
• Mitigation success
• System availability

What gets measured gets improved.`,
    ['Metrics', 'Performance']
  ),

  // Day 21: Global Market Dynamics
  createPost(
    21,
    1,
    'Global C-UAS Market Drivers',
    `Global C-UAS Market Drivers:

• Rising security incidents
• Regulatory mandates
• Technology maturation
• Cost reduction
• Proven ROI

Demand exceeding supply in key sectors.`,
    ['MarketDynamics', 'Global']
  ),
  createPost(
    21,
    2,
    'Regional Market Differences',
    `Regional Market Differences:

North America: Regulation driven
Europe: Privacy focused
Asia: Rapid adoption
Middle East: Security priority
Africa: Emerging market

One size doesn't fit all.`,
    ['GlobalMarkets', 'Regional']
  ),
  createPost(
    21,
    3,
    'Market Consolidation Trends',
    `Market Consolidation Trends:

Large defense contractors acquiring innovative startups.

Result:
• Accelerated development
• Improved integration
• Global distribution
• Enhanced support

Innovation meets scale.`,
    ['MarketTrends', 'Consolidation']
  ),

  // Day 22: Urban Environment Challenges
  createPost(
    22,
    1,
    'Urban Counter-UAS Complexity',
    `Urban Counter-UAS Complexity:

Cities present unique challenges:
• Dense RF environment
• Multiple stakeholders
• Privacy concerns
• Collateral risk
• Infrastructure interference

Urban security requires precision.`,
    ['UrbanSecurity', 'CityDefense']
  ),
  createPost(
    22,
    2,
    'Smart City Integration',
    `Smart City Integration:

C-UAS as part of urban infrastructure:
• Traffic management systems
• Emergency services
• Public safety networks
• Event management
• Critical facilities

Connected cities need connected defense.`,
    ['SmartCities', 'Integration']
  ),
  createPost(
    22,
    3,
    'Urban Air Mobility Impact',
    `Urban Air Mobility Impact:

Future cities with:
• Delivery drones
• Air taxis
• Emergency drones
• Inspection UAVs

Require sophisticated traffic management AND security.`,
    ['UAM', 'FutureCities']
  ),

  // Day 23: Research & Development
  createPost(
    23,
    1,
    'R&D Focus Areas',
    `R&D Focus Areas:

Current research priorities:
• AI/ML enhancement
• Miniaturization
• Power efficiency
• Counter-swarm
• Non-kinetic options

Innovation never stops.`,
    ['RnD', 'Innovation']
  ),
  createPost(
    23,
    2,
    'University Research Programs',
    `University Research Programs:

Academic institutions advancing:
• Detection algorithms
• Materials science
• Autonomous systems
• Legal frameworks
• Human factors

Academia-industry partnership crucial.`,
    ['Research', 'Academic']
  ),
  createPost(
    23,
    3,
    'Breakthrough Technologies',
    `Breakthrough Technologies:

On the horizon:
• Quantum sensors
• Metamaterial antennas
• Neuromorphic processors
• Photonic computing
• Bio-inspired systems

The future is closer than you think.`,
    ['Breakthrough', 'FutureTech']
  ),

  // Day 24: Cybersecurity Aspects
  createPost(
    24,
    1,
    'C-UAS Cybersecurity',
    `C-UAS Cybersecurity:

Counter-drone systems are targets too:
• Hacking attempts
• Spoofing attacks
• Data breaches
• System manipulation
• DOS attacks

Securing the security system.`,
    ['Cybersecurity', 'InfoSec']
  ),
  createPost(
    24,
    2,
    'Cyber-Physical Security',
    `Cyber-Physical Security:

Drones as cyber vectors:
• WiFi infiltration
• Network scanning
• Payload delivery
• Signal interception
• Data exfiltration

Physical and cyber merge.`,
    ['CyberPhysical', 'Security']
  ),
  createPost(
    24,
    3,
    'Best Practices for C-UAS Cybersecurity',
    `Best Practices for C-UAS Cybersecurity:

• Regular updates
• Network segregation
• Access controls
• Encryption
• Audit logs
• Incident response plans

Defense in depth applies.`,
    ['BestPractices', 'Cyber']
  ),

  // Day 25: Standards & Certification
  createPost(
    25,
    1,
    'Industry Standards Evolution',
    `Industry Standards Evolution:

Emerging standards for:
• Performance testing
• Safety requirements
• Interoperability
• Data formats
• Certification processes

Standards drive adoption.`,
    ['Standards', 'Industry']
  ),
  createPost(
    25,
    2,
    'Certification Importance',
    `Certification Importance:

Why certification matters:
• Validates performance
• Ensures safety
• Enables comparison
• Reduces liability
• Builds trust

Look for certified solutions.`,
    ['Certification', 'Quality']
  ),
  createPost(
    25,
    3,
    'Testing & Evaluation',
    `Testing & Evaluation:

Rigorous T&E includes:
• Environmental testing
• Performance validation
• Safety assessment
• Interoperability checks
• Durability testing

Trust but verify.`,
    ['Testing', 'Evaluation']
  ),

  // Day 26: Small UAS vs Large UAS
  createPost(
    26,
    1,
    'Size Matters in Counter-UAS',
    `Size Matters in Counter-UAS:

Small drones (<55 lbs):
• Hard to detect
• Agile
• Cheap
• Numerous

Large drones:
• Easier detection
• Greater payload
• Longer range
• Higher capability

Different threats, different responses.`,
    ['DroneSize', 'Threats']
  ),
  createPost(
    26,
    2,
    'Detection Range by Size',
    `Detection Range by Size:

Micro (<250g): 100-500m
Small (250g-25kg): 500m-3km
Medium (25-150kg): 3-10km
Large (>150kg): 10km+

Smaller = harder to detect early.`,
    ['Detection', 'RangeCapability']
  ),
  createPost(
    26,
    3,
    'Response Scaling',
    `Response Scaling:

Small drone: RF jamming sufficient
Medium drone: Kinetic option ready
Large drone: Coordinated response
Swarm: Multi-system engagement

Right tool for right threat.`,
    ['Response', 'Scaling']
  ),

  // Day 27: Environmental Applications
  createPost(
    27,
    1,
    'Protecting Natural Resources',
    `Protecting Natural Resources:

C-UAS for environmental protection:
• Wildlife preserve monitoring
• Anti-poaching operations
• Forest fire prevention
• Marine sanctuary protection

Technology serving nature.`,
    ['Environmental', 'Conservation']
  ),
  createPost(
    27,
    2,
    'Wildlife Protection Success',
    `Wildlife Protection Success:

African reserve deployment:
• Detected poacher drones
• Protected endangered species
• Gathered evidence
• Zero collateral impact

Conservation through technology.`,
    ['Wildlife', 'ConservationTech']
  ),
  createPost(
    27,
    3,
    'Marine Environment Challenges',
    `Marine Environment Challenges:

Sea-based C-UAS faces:
• Salt corrosion
• Platform motion
• Weather extremes
• Power limitations
• Maintenance access

Unique environment, unique solutions.`,
    ['Marine', 'Environmental']
  ),

  // Day 28: Future Technologies
  createPost(
    28,
    1,
    'Next-Gen Detection',
    `Next-Gen Detection:

Coming soon:
• Quantum radar
• Passive radar networks
• Distributed sensing
• Space-based detection
• AI sensor fusion

Detection evolving rapidly.`,
    ['FutureTech', 'NextGen']
  ),
  createPost(
    28,
    2,
    'Counter-Swarm Technologies',
    `Counter-Swarm Technologies:

Emerging solutions:
• Defensive drone swarms
• Wide-area EMP
• Coordinated jamming
• AI battle management
• Autonomous interceptors

Many vs many.`,
    ['CounterSwarm', 'Future']
  ),
  createPost(
    28,
    3,
    '2030 Vision',
    `2030 Vision:

Expect:
• Fully autonomous C-UAS
• City-wide protection
• Predictive threat prevention
• Seamless integration
• Zero human intervention

The future is autonomous.`,
    ['Future2030', 'Vision']
  ),

  // Day 29: Lessons Learned
  createPost(
    29,
    1,
    'Key Lessons from Deployments',
    `Key Lessons from Deployments:

1. One sensor type isn't enough
2. Training is critical
3. Integration challenges are real
4. Maintenance matters
5. Evolution is constant

Experience teaches.`,
    ['LessonsLearned', 'Experience']
  ),
  createPost(
    29,
    2,
    'Common Mistakes to Avoid',
    `Common Mistakes to Avoid:

• Underestimating complexity
• Skipping training
• Ignoring maintenance
• Poor site planning
• Regulatory assumptions

Learn from others' experiences.`,
    ['Mistakes', 'Learning']
  ),
  createPost(
    29,
    3,
    'Success Factors',
    `Success Factors:

• Executive support
• Clear requirements
• Proper funding
• Expert partners
• Continuous improvement

Getting it right from the start.`,
    ['Success', 'BestPractices']
  ),

  // Day 30: Campaign Wrap-Up
  createPost(
    30,
    1,
    '30 Days of Counter-UAS Insights',
    `30 Days of Counter-UAS Insights:

We've explored:
• Detection technologies
• Mitigation methods
• Integration challenges
• Real-world applications
• Future innovations

The journey to secure airspace continues.`,
    ['MonthComplete', 'CounterUAS']
  ),
  createPost(
    30,
    2,
    'Key Takeaways',
    `Key Takeaways:

• Threats are evolving rapidly
• Technology alone isn't enough
• Integration is crucial
• Training makes the difference
• Future requires innovation

Knowledge enables protection.`,
    ['KeyTakeaways', 'Summary']
  ),
  createPost(
    30,
    3,
    'Looking Ahead',
    `Looking Ahead:

The counter-drone industry is just beginning. As drones become ubiquitous, so must our defenses.

Thank you for joining our exploration of aerospace security and counter-UAS technology.

What topic should we explore next?`,
    ['ThankYou', 'Future', 'AerospaceSecurity']
  ),
];

// Full campaign object
export const aerospaceCampaignSeed: Campaign = {
  id: AEROSPACE_CAMPAIGN_ID,
  name: 'Month 1: Aerospace & Counter-Drone Technology',
  description:
    '30-day deep dive into counter-UAS technology, detection methods, mitigation strategies, and airspace security. 3 posts per day covering technical education, industry analysis, and engagement content.',
  status: 'scheduled',
  seriesIds: [AEROSPACE_SERIES_ID],
  contentItems: aerospaceCampaignPosts,
  platforms: [
    {
      platformId: 'twitter',
      platformName: 'Twitter',
      enabled: true,
      config: {
        postFrequency: 'daily',
        bestTimes: ['09:00', '14:00', '18:00'],
        threadEnabled: true,
        maxPostLength: 280,
        defaultHashtags: ['CounterUAS', 'DroneDefense'],
      },
    },
    {
      platformId: 'linkedin',
      platformName: 'LinkedIn',
      enabled: true,
      config: {
        postFrequency: 'daily',
        bestTimes: ['09:00', '14:00'],
        threadEnabled: false,
        maxPostLength: 3000,
        defaultHashtags: ['AerospaceSecurity', 'DroneDefense'],
      },
    },
    {
      platformId: 'facebook',
      platformName: 'Facebook',
      enabled: false,
      config: {
        postFrequency: 'daily',
        bestTimes: ['09:00', '13:00'],
        threadEnabled: false,
        maxPostLength: 63206,
        defaultHashtags: [],
      },
    },
    {
      platformId: 'instagram',
      platformName: 'Instagram',
      enabled: false,
      config: {
        postFrequency: 'daily',
        bestTimes: ['11:00', '19:00'],
        threadEnabled: false,
        maxPostLength: 2200,
        defaultHashtags: [],
      },
    },
  ],
  schedule: {
    startDate: '2025-12-01T00:00:00Z',
    endDate: '2025-12-30T23:59:59Z',
    timezone: 'America/New_York',
    posts: [], // Will be populated by scheduler
  },
  metrics: {
    totalPosts: 90,
    publishedPosts: 0,
    scheduledPosts: 90,
    failedPosts: 0,
    totalEngagement: 0,
    platformMetrics: {},
  },
  createdAt: '2025-12-01T00:00:00Z',
  updatedAt: '2025-12-05T00:00:00Z',
  tags: ['counter-uas', 'drone-defense', 'aerospace', 'security', 'technology', 'month1'],
};

export default aerospaceCampaignSeed;
