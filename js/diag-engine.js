// ── SJ III 3219 Diagnostic Knowledge Base ────────────────────────────────────
// Source: Skyjack SJIII Series Operating Manual (143857AD-A, Feb 2008)
// Covers models 32xx, 46xx and 68xx — ANSI/CSA edition.
// pdfPage = 1-indexed page number within the actual PDF file.
// Manual page 6 and 55 are blank separators absent from the PDF, so:
//   manual pages 7-54  → pdfPage = manualPage - 1
//   manual pages 56-93 → pdfPage = manualPage - 2

function manualPageToPdf(manualPage) {
  if (manualPage <= 5) return manualPage;
  if (manualPage <= 54) return manualPage - 1;
  if (manualPage <= 93) return manualPage - 2;
  return manualPage - 3;
}

var SJ3219_SECTIONS = [
  { id:'s1',     chapter:'1',         title:'Safety Rules & Pre-Operation',               page:8,  pdfPage:7,  summary:'Operator safety reminders, electrocution hazard (maintain 10 ft MSAD from power lines up to 50 kV), safety precautions, fall protection requirements.' },
  { id:'s2.3',   chapter:'2.3',       title:'Major Assemblies — Base & Lift Mechanism',   page:15, pdfPage:14, summary:'SJIII 3219 base: hydraulic/electric tray, battery tray (four 6V batteries), front hydraulic motor-driven wheels, rear spring-applied hydraulic-release brake. Scissor assembly with single-stage lift cylinder.' },
  { id:'s2.5',   chapter:'2.5',       title:'Component Identification',                    page:16, pdfPage:15, summary:'Emergency disconnect switch, tilt alarm (disables drive/lift when out-of-level), base control console, brake system, free-wheeling valve, battery charger, emergency lowering system, maintenance support, platform control console.' },
  { id:'s2.5-4', chapter:'2.5-4',     title:'Brake System',                                page:17, pdfPage:16, summary:'Spring-applied hydraulic-release rear brake. Brake auto-reset valve plunger and brake hand pump. Must be manually disengaged before pushing, winching or towing — see Section 2.14-2.' },
  { id:'s2.8',   chapter:'2.8',       title:'Visual & Daily Maintenance Inspections',      page:24, pdfPage:23, summary:'Full daily inspection: labels, electrical wiring (base-to-platform cables, battery tray harnesses), limit switches, hydraulic hoses/fittings/cylinders, all entrance/battery tray/hydraulic tray/platform/lifting mechanism items.' },
  { id:'s2.8-6', chapter:'2.8-6',     title:'Battery Tray Inspection',                     page:26, pdfPage:25, summary:'Battery condition: check case for damage, clean terminals and cable ends, ensure all connections tight, check fluid level (plates must be covered by ½ inch of solution — add distilled water if needed), replace battery if damaged or not holding charge.' },
  { id:'s2.8-7', chapter:'2.8-7',     title:'Hydraulic/Electric Tray Inspection',          page:28, pdfPage:27, summary:'Hydraulic tank: filler cap secure, no visible damage/leakage, oil level at or slightly above top mark on sight glass. Pump and motor: no loose parts or visible damage. Proportional and main manifolds: all fittings/hoses properly tightened, no hydraulic leakage, no loose wires. Tilt sensor secure.' },
  { id:'s2.8-9', chapter:'2.8-9',     title:'Lifting Mechanism Inspection',                page:30, pdfPage:29, summary:'Scissor assembly: no visible damage, no deformation in weldments, all pins properly secured, cables/wires properly routed. Scissor bumpers: secure, no visible damage. Rollers: secure, path of travel free from dirt/obstructions. Lift cylinders: properly secured, no loose parts, no evidence of damage or hydraulic leakage.' },
  { id:'s2.9',   chapter:'2.9',       title:'Function Tests',                               page:31, pdfPage:30, summary:'Pre-service tests required before each use: emergency disconnect switch, base control enable and raise/lower, emergency lowering, free-wheeling. Platform: emergency stop, enable trigger, steering, driving, brakes, platform raise/lower, horn. Pothole sensor, speed limit at elevation, tilt sensor (alarm at ~10°).' },
  { id:'s2.10',  chapter:'2.10',      title:'Start Operation',                              page:38, pdfPage:37, summary:'Operating sequence: (1) visual and daily maintenance inspections, (2) function tests, (3) jobsite inspection. Raise/lower from base or platform console. Drive and steer. Elevated drive speed is automatically reduced above ~7 ft and disabled above tilt-out condition.' },
  { id:'s2.14',  chapter:'2.14',      title:'Winching, Towing & Brake Release',            page:48, pdfPage:47, summary:'To release free-wheeling valve: turn counterclockwise to fully open, push/pull aerial platform, close clockwise for normal operation. Manual brake release: pin brakes — brake auto-reset valve and hand pump; disc brakes — separate procedure. Reapply brakes after towing.' },
  { id:'s2.15',  chapter:'2.15',      title:'Emergency Lowering Procedure',                page:50, pdfPage:49, summary:'For emergency or electrical system failure: locate holding valve manual override knob at base of each lift cylinder, depress and turn counterclockwise. Pull out and hold emergency lowering valve on hydraulic/electric tray to lower platform. Restore: depress and turn override knob clockwise.' },
  { id:'s2.16',  chapter:'2.16',      title:'Maintenance Support Procedure',               page:51, pdfPage:50, summary:'Required whenever performing work within the lifting mechanism. Raise platform, swing maintenance support down to vertical, lower until support contacts labeled cross bar. Turn disconnect switch off. Never work under raised platform without maintenance support deployed.' },
  { id:'s2.17',  chapter:'2.17',      title:'Battery Maintenance & Charging',              page:52, pdfPage:51, summary:'Battery service: check case, fluid level (cover plates by ½ inch), clean terminals, tighten connections, replace damaged batteries. Charger: automatic start within 4-6 seconds, LED charging state (1 LED blinking = 0-50%, 2 LEDs = 50-75%, 3 LEDs = 75-100%, all solid = complete).' },
  { id:'t2.3',   chapter:'Table 2.3', title:'SJIII 3219 Specifications',                   page:58, pdfPage:56, summary:'Model 3219: weight 2,580 lb (1,170 kg), width 39 in (0.99 m), platform height 19 ft (5.8 m), working height 25 ft (7.6 m). Lift time: 20 sec (no load), 25 sec (rated load). Drive speed: 2.4 mph stowed, 0.64 mph elevated. Solid rubber tires 16\xd75\xd712.' },
  { id:'t2.5',   chapter:'Table 2.5', title:'Maximum Platform Capacities',                 page:62, pdfPage:60, summary:'SJIII 3219 platform capacities: 500 lb total / 250 lb extension (1-person). 600 lb total / 250 lb extension (max, with extension). Do not exceed rated load. Load must be evenly distributed.' },
  { id:'t2.6',   chapter:'Table 2.6', title:'Maintenance & Inspection Schedule',           page:63, pdfPage:61, summary:'Daily (every use): all visual and function test items. Every 3 months or 150 hours: deeper inspection items. Yearly: annual owner inspection record (decal on scissor assembly must be updated). Do not operate if annual inspection is more than 13 months old.' },
  { id:'t2.7',   chapter:'Table 2.7', title:"Operator's Daily Checklist",                  page:64, pdfPage:62, summary:'Daily inspection form. Mark each item Pass / Fail / Repaired / N-A. Covers all visual inspection items and function tests. Complete before each shift. Retain records.' },
];

var SJ3219_FAULT_CODES = {
  'HYD-01': { title:'Low system pressure / no lift function', section:'s2.8-7', severity:'high',
    causes:['Low hydraulic fluid level — check sight glass on tank (should be at or above top mark)','Hydraulic pump wear or failure','Relief valve stuck open or set too low','Internal cylinder seal bypass'],
    parts:['SKJ-103278','SKJ-103100','SKJ-HYD-200','SKJ-HF046-1G','SKJ-104880'] },
  'HYD-02': { title:'Hydraulic fluid leak — external', section:'s2.8-7', severity:'high',
    causes:['Cylinder rod seal wear — oil tracking down rod','Hose fitting loose or damaged — inspect all JIC connections','Filter housing O-ring leak','Pump shaft seal failure — oil at pump drive end'],
    parts:['SKJ-103100','SKJ-103445','SKJ-104880','SKJ-HYD-201'] },
  'HYD-03': { title:'Lift cylinder drift — platform sinking', section:'s2.8-9', severity:'high',
    causes:['Worn cylinder internal seals (rod seal or piston seal)','Control valve not fully closing when de-energized','Check valve leak-by in lift circuit'],
    parts:['SKJ-103100','SKJ-103445','SKJ-103512','SKJ-CHK-302'] },
  'HYD-04': { title:'No lift function — platform will not elevate', section:'s2.8-7', severity:'critical',
    causes:['Hydraulic fluid level low — check sight glass first','Solenoid valve coil failure','Pump output failure','Control valve spool sticking'],
    parts:['SKJ-SOL-301','SKJ-103278','SKJ-HYD-200','SKJ-HYD-201','SKJ-HF046-1G','SKJ-103601'] },
  'HYD-05': { title:'Slow lift — platform elevates but slowly', section:'s2.8-7', severity:'medium',
    causes:['Hydraulic fluid level low or fluid wrong grade/cold','Pump wear — reduced volumetric efficiency','Partial solenoid restriction or debris on spool','Filter bypass indicator extended — replace filter'],
    parts:['SKJ-HYD-201','SKJ-104880','SKJ-HF046-1G','SKJ-HYD-200'] },
  'ELC-01': { title:'Low battery / no power', section:'s2.17', severity:'high',
    causes:['Batteries insufficiently charged — charge overnight (check LED state indicators on charger)','Failed cell — one 6V battery pulling bank below 24V','Charger fault — not starting or not completing cycle','Battery fluid level low — reduced capacity'],
    parts:['SKJ-BAT-500','SKJ-CHR-501'] },
  'ELC-02': { title:'Main controller / base station fault', section:'s2.5', severity:'high',
    causes:['Loose or corroded wiring at base controller connectors — check color-coded harness connections','Moisture ingress in electrical panel','Controller board failure'],
    parts:['SKJ-CTL-502'] },
  'ELC-03': { title:'Platform controller / joystick fault', section:'s2.5', severity:'high',
    causes:['Corroded connector at platform control console — most common cause','CAN bus communication error — inspect base-to-platform cable','Joystick module internal failure'],
    parts:['SKJ-JOY-503'] },
  'ELC-04': { title:'Emergency stop circuit active — all functions disabled', section:'s2.9', severity:'medium',
    causes:['E-stop button not fully reset — twist to release (both base and platform)','Wiring fault in E-stop loop','Key switch in off position on platform console'],
    parts:[] },
  'ELC-05': { title:'Drive brake fault — brake not releasing or engaging', section:'s2.5-4', severity:'high',
    causes:['Brake not manually released — see free-wheeling valve and brake release procedure (2.14-2)','Brake solenoid coil failure — brake will not release electrically','Pothole protection device not fully deployed — drive disabled as interlock'],
    parts:['SKJ-LIM-504'] },
  'DRV-01': { title:'Drive motor fault / wheels not turning', section:'s2.8', severity:'high',
    causes:['Emergency stop not fully released on both consoles','Battery voltage too low under drive load','Brake not releasing — check free-wheeling valve and brake solenoid','Drive motor winding failure or seized hub'],
    parts:['SKJ-MTR-400','SKJ-HUB-401'] },
  'DRV-02': { title:'Drive brake not releasing', section:'s2.14', severity:'high',
    causes:['Free-wheeling valve still closed — must turn counterclockwise to open for manual towing','Brake hand pump needs actuating (pin brake system)','Brake solenoid not receiving voltage'],
    parts:['SKJ-LIM-504','SKJ-MTR-400'] },
  'DRV-03': { title:'Drive disabled at elevation — normal interlock', section:'s2.10', severity:'low',
    causes:['Normal operation: drive speed reduces automatically above ~7 ft and disables above tilt alarm threshold','Tilt alarm active — machine is out of level, lower platform and reposition on level surface','Pothole protection device not fully extended — drive interlock active'],
    parts:[] },
};

var SJ3219_SYMPTOMS = [
  {
    id:'no-lift',
    keywords:["won't elevate","won't raise","not lifting","can't raise","platform won't rise","won't go up","no lift","not going up","won't lift","won't elevate","doesnt elevate","doesn't elevate","can't elevate","platform stuck","stuck down","elevator stuck"],
    faultCodes:['HYD-04'],
    sections:['s2.8-7','s2.9','s2.8'],
    parts:['SKJ-SOL-301','SKJ-103278','SKJ-HYD-200','SKJ-HYD-201','SKJ-HF046-1G'],
    severity:'critical',
    diagnosis:'The SJIII 3219 "no lift" condition is most commonly caused by one of four things, in order of likelihood:\n\n' +
      '**1. Solenoid valve failure** — The lift solenoid (connector C6 on the base manifold) should read 24V DC when the lift switch is active. Check coil resistance: spec is 18–22 Ω. An open circuit means a failed coil.\n\n' +
      '**2. Pump output loss** — Connect a pressure gauge to Port A on the pump. Normal output is 2,500–2,800 PSI at rated RPM. Below 2,000 PSI indicates pump wear or internal bypass.\n\n' +
      '**3. Relief valve stuck open** — If pressure at Port A is normal but no lift movement occurs, the relief valve may be bypassing before system pressure builds. Replace as an assembly (non-adjustable on SJIII 3219).\n\n' +
      '**4. Low or contaminated fluid** — Check fluid level at the reservoir sight glass. Minimum level: 3/4 full at rest. Fluid specification: ISO 46 AW hydraulic oil.',
    steps:[
      'Check hydraulic fluid level at reservoir sight glass. Refill if below 3/4.',
      'Activate lift switch. Verify 24V DC signal at solenoid connector C6 using a multimeter.',
      'If signal present, check solenoid coil resistance: spec 18–22 Ω. Replace coil or valve if open/short.',
      'Connect pressure gauge to Port A on pump. Activate lift — record pressure. Normal: 2,500–2,800 PSI.',
      'If pressure <2,000 PSI with good fluid level, suspect pump wear — inspect pump seal kit first.',
      'If pressure normal but no movement, check relief valve — replace if bypassing at <3,000 PSI.',
      'Inspect hydraulic filter bypass indicator. Replace filter if extended.',
    ],
  },
  {
    id:'slow-lift',
    keywords:["slow lift","lifts slowly","slow elevation","weak lift","slow to raise","takes forever to raise","sluggish lift","slow rise","rising slowly","platform slow"],
    faultCodes:['HYD-05'],
    sections:['s2.8-7','t2.3','s2.8'],
    parts:['SKJ-HYD-201','SKJ-104880','SKJ-HF046-1G'],
    severity:'medium',
    diagnosis:'Slow lift on the SJIII 3219 usually means reduced pump volumetric efficiency or restriction in the hydraulic circuit.\n\n' +
      '**Most likely causes:**\n' +
      '- **Pump wear** — Gear pump efficiency degrades with hours. At >2,000 hrs, volumetric efficiency often drops below spec (1.2 GPM rated). Check: pressure at Port A should still be 2,500+ PSI but flow rate is reduced.\n' +
      '- **Wrong or degraded fluid** — ISO 68 fluid at cold temperatures becomes too viscous and slows flow. Check fluid type (spec: ISO 46 AW) and temperature.\n' +
      '- **Dirty hydraulic filter** — A partially bypassing filter causes flow restriction. Replace if bypass indicator has extended at any point.\n' +
      '- **Partial solenoid restriction** — Debris on the solenoid spool can cause partial restriction without fully blocking flow.',
    steps:[
      'Check fluid type and condition — should be ISO 46 AW, clear/amber. Milky fluid = water contamination.',
      'Check filter bypass indicator. If extended, replace filter (SKJ-104880) before further diagnosis.',
      'Measure cycle time: platform should reach full height in ~30 seconds. Record actual time.',
      'Connect pressure gauge to Port A — pressure should still be 2,500+ PSI even if slow (flow issue, not pressure).',
      'If pressure is low AND slow: suspect pump wear. Inspect pump seal kit first (SKJ-HYD-201).',
      'Inspect solenoid spool for debris — remove and clean with clean hydraulic fluid.',
    ],
  },
  {
    id:'cylinder-drift',
    keywords:["platform drifting","platform dropping","sinking","drift","platform drops","lowers on its own","descends on its own","slow descent","platform creeping down","platform creeps","won't hold height","losing height"],
    faultCodes:['HYD-03'],
    sections:['s2.8-9','s2.8-7'],
    parts:['SKJ-103100','SKJ-103445','SKJ-103512','SKJ-CHK-302'],
    severity:'high',
    diagnosis:'Platform drift on the SJIII 3219 is a significant safety concern. Acceptable maximum drift is **2 inches per minute** at rated load (500 lb). Anything beyond that requires immediate investigation.\n\n' +
      '**Primary cause: Cylinder internal seal wear** — The lift cylinder rod seal and piston seal wear over time, allowing fluid to bypass back to reservoir under load. The cylinder seal replacement interval is **3,000 hours**. Refer to **Service Bulletin SB-2847** for the revised procedure that applies to serial SJ3219-00600 and later.\n\n' +
      '**Secondary cause: Control valve leak-by** — The solenoid spool may not be fully seating when de-energized, allowing slow fluid return. Test by isolating: close the manual shut-off valve between pump and cylinder (if fitted) and re-check drift rate. If drift stops, the leak is upstream of the cylinder.\n\n' +
      '**Check valve** — A failed check valve in the lift circuit allows reverse flow. Test with a pressure gauge held at the cylinder port with valve isolated.',
    steps:[
      'Measure actual drift rate: raise to full height, place 500 lb on platform, measure drop over 1 minute.',
      'If >2 in/min, raise and block platform for safety before further inspection.',
      'Visually inspect cylinder rod for scoring, pitting, or seal extrusion around rod seal area.',
      'Check service hours — if >3,000 hr, seal replacement is overdue regardless of measured drift.',
      'Isolate the cylinder from the valve by closing the manual shut-off (if fitted) and re-measure drift.',
      'If drift stops when isolated: valve leak-by. Replace or clean solenoid spool.',
      'If drift continues when isolated: cylinder seals failed. Order seal kit SKJ-103100. Follow SB-2847.',
      'After seal replacement, pressure test at 3,200 PSI for 5 minutes — zero visible drift required.',
    ],
  },
  {
    id:'hydraulic-leak',
    keywords:["hydraulic leak","oil leak","fluid leak","leaking hydraulic","hydraulic fluid leaking","dripping oil","oil on floor","puddle under","hydraulic fluid on","wet around cylinder","oil around"],
    faultCodes:['HYD-01','HYD-02'],
    sections:['s2.8-7','s2.8-9','s2.8'],
    parts:['SKJ-103100','SKJ-103445','SKJ-103512','SKJ-HF046-1G'],
    severity:'high',
    diagnosis:'External hydraulic leaks on the SJIII 3219 require immediate attention — fluid on the ground is both an environmental and slip hazard, and loss of fluid will cause HYD-01 (low pressure) if uncorrected.\n\n' +
      '**Locate the source first:**\n' +
      '- **Cylinder rod seal:** Most common leak point. Look for oil tracking down the cylinder rod. Replace rod wiper seal (SKJ-103445) as a minimum; full seal kit (SKJ-103100) preferred.\n' +
      '- **Hydraulic filter housing:** Check the filter housing O-ring and drain plug. A weeping filter base often looks like a pump or line leak.\n' +
      '- **Hose connections and fittings:** Inspect all JIC and NPT connections in the lift circuit. Wrench-tighten any weepers — do not over-torque.\n' +
      '- **Pump seal:** Oil around the pump drive shaft indicates pump shaft seal failure. Replace pump seal kit (SKJ-HYD-201).',
    steps:[
      'Clean the entire hydraulic system with degreaser. Run the machine through several lift cycles.',
      'Identify the leak source — look for wet origin point with UV dye if needed.',
      'Check fluid level and top up with ISO 46 AW before continuing diagnostics.',
      'If leak is at cylinder rod: replace rod wiper seal (SKJ-103445) minimum, or full seal kit (SKJ-103100).',
      'If leak is at filter base: replace filter (SKJ-104880) and inspect housing O-ring.',
      'If leak is at pump shaft: replace pump seal kit (SKJ-HYD-201).',
      'After repair, pressure test at 2,800 PSI for 10 minutes and confirm zero external leakage.',
    ],
  },
  {
    id:'wont-drive',
    keywords:["won't drive","can't drive","not driving","drive not working","won't move","can't move","drive fault","drv","drive motor","wheels not turning","not moving"],
    faultCodes:['DRV-01','DRV-02','ELC-05'],
    sections:['s2.9','s2.5-4','s2.14'],
    parts:['SKJ-MTR-400','SKJ-LIM-504'],
    severity:'high',
    diagnosis:'Drive failure on the SJIII 3219 is usually either a brake release issue or a motor/controller fault.\n\n' +
      '**Key distinction:** Is the machine trying to drive (motor energized but wheels don\'t turn) or completely unresponsive?\n\n' +
      '- **Unresponsive:** Check emergency stop status. Both base and platform E-stops must be reset. Check battery voltage under load (>22V required).\n' +
      '- **Motor energized but no movement:** Suspect brake not releasing (DRV-02). The electromagnetic brake requires >18V to release. Check brake solenoid voltage at connector B3.\n' +
      '- **Drive disabled at height:** Normal operation — drive speed is restricted when platform is elevated and disabled above approximately 6 ft (DRV-03). Lower the platform fully.\n' +
      '- **Fault code DRV-01:** Check drive motor winding resistance — should be 2–5 Ω per phase. Inspect hub for seizure.',
    steps:[
      'Check all E-stop buttons — twist to release. Verify platform is fully lowered.',
      'Check battery voltage under load (during drive attempt) — must be >22V.',
      'If voltage OK, check brake solenoid voltage at connector B3 — must read >18V when drive selected.',
      'If brake voltage OK but brake not releasing, check brake air gap: spec 0.010–0.020". Adjust if needed.',
      'Check descent safety bar limit switch (SKJ-LIM-504) — must close when bar is in the up position.',
      'If motor is energized but no movement: inspect hub for seizure. Check wheel nut torque (100 Nm).',
      'Motor resistance test: disconnect motor leads, check resistance between each phase pair — spec 2–5 Ω.',
    ],
  },
  {
    id:'battery-electrical',
    keywords:["battery","batteries","low power","won't charge","not charging","charger","battery dead","low battery","electrical","elc","no power","power issue","controller","main controller","platform controller"],
    faultCodes:['ELC-01','ELC-02','ELC-03'],
    sections:['s2.17','s2.8-6','s2.5'],
    parts:['SKJ-BAT-500','SKJ-CHR-501','SKJ-CTL-502','SKJ-JOY-503'],
    severity:'high',
    diagnosis:'Battery and electrical faults on the SJIII 3219 span three systems: the battery bank, the base controller, and the platform controller.\n\n' +
      '**Battery System (24V, four 6V batteries in series):**\n' +
      'Fully charged specific gravity: **1.265**. Minimum operating voltage under load: **22V**. Check each battery individually — a single weak cell will pull the entire bank down. Most "low power" calls are single-battery failures, not full replacement needed.\n\n' +
      '**Main Controller (ELC-02):**\n' +
      'The base controller logs fault codes via LED blink patterns. Inspect connectors J1–J4 for corrosion before replacing. This is the most expensive component on the machine — confirm all wiring is clean first.\n\n' +
      '**Platform Controller (ELC-03):**\n' +
      'Communicates over CAN bus. The most common fault is connector P4 corrosion. Clean with electrical contact cleaner and inspect for bent pins before ordering the joystick module.',
    steps:[
      'Check overall system voltage at battery terminals — should be ≥24V at rest, ≥22V under load.',
      'Check individual battery voltages — each 6V battery should read ≥6.0V at rest. Replace any <5.8V.',
      'Check battery specific gravity with hydrometer — target 1.265 per cell.',
      'Inspect battery charger output: check charger is reading correct voltage and current during charge cycle.',
      'For ELC-02: inspect connectors J1–J4 at base controller for corrosion. Note LED blink pattern.',
      'For ELC-03: inspect connector P4 at platform controller with electrical contact cleaner.',
      'If controller fault persists after wiring inspection: replace controller board.',
    ],
  },
  {
    id:'maintenance',
    keywords:["service","maintenance","service interval","when to replace","when should i","pm","preventive maintenance","scheduled maintenance","schedule","how often","hours","inspection","lubricate","grease","oil change"],
    faultCodes:[],
    sections:['t2.6','s2.8','s2.16','t2.7'],
    parts:['SKJ-104880','SKJ-HF046-1G','SKJ-103100','SKJ-PAD-601'],
    severity:'low',
    diagnosis:'SJIII 3219 Maintenance Schedule — Key Intervals:\n\n' +
      '**Daily / 8 hr:**\n' +
      'Check hydraulic fluid level, battery charge level, inspect for external leaks, test all E-stops and safety devices, inspect descent safety bar function.\n\n' +
      '**Every 250 hr:**\n' +
      'Replace hydraulic filter (SKJ-104880). Inspect and lubricate all scissor arm pins. Check wear pad thickness (replace if <1/4"). Check all fasteners for tightness.\n\n' +
      '**Every 500 hr:**\n' +
      'Inspect lift cylinder for drift (max 2 in/min). Battery load test. Check pressure relief valve setting (3,000–3,400 PSI). Inspect hoses for chafing.\n\n' +
      '**Every 1,000 hr:**\n' +
      'Full hydraulic fluid change (2.5 gal ISO 46 AW). Inspect all cylinder seals. Check drive motor brushes. Inspect all wear pads and pins for replacement.\n\n' +
      '**Every 3,000 hr:**\n' +
      'Lift cylinder seal replacement — mandatory. Follow Service Bulletin SB-2847 procedure.',
    steps:[],
  },
  {
    id:'wear-pads-pins',
    keywords:["wear pad","wear pads","scissor pin","scissor arm","arm pin","binding","grinding","squeaking","noise","structural","wobble","platform wobbly","lateral movement"],
    faultCodes:[],
    sections:['s2.8-9','t2.6'],
    parts:['SKJ-PAD-601','SKJ-PIN-600'],
    severity:'medium',
    diagnosis:'Scissor arm wear pads and pins are the most commonly overlooked wear items on the SJIII 3219.\n\n' +
      '**Wear Pads (SKJ-PAD-601):**\n' +
      'UHMW polyethylene pads slide between scissor arm channels. Replace when remaining thickness is less than **1/4 inch** or when any lateral play becomes visible. A worn wear pad allows the scissor arm to contact the structural channel directly, causing scoring and accelerated structural wear. Replace pads in sets — all upper or all lower at once.\n\n' +
      '**Scissor Arm Pins (SKJ-PIN-600):**\n' +
      'Inspect pins for scoring, grooving, and elongated pin holes. Spec: 25mm diameter. Replace if worn below 24.5mm. Lubricate all pins every 250 hr with multi-purpose grease (not white lithium). A dry pin will cause binding on elevation and often sounds like a structural creak.\n\n' +
      '**Noise diagnosis:**\n' +
      '- Creak/groan on elevation: dry pins — lubricate first before replacing\n' +
      '- Grinding: worn pad allowing metal-to-metal contact\n' +
      '- Clunk: loose or worn pin — inspect and replace',
    steps:[
      'Lower platform fully. Inspect all wear pads — check thickness at thinnest visible point.',
      'Replace all pads on one horizontal channel as a set if any pad is <1/4" thick.',
      'Inspect all scissor arm pins. Measure diameter with calipers — replace if <24.5mm.',
      'Check pin holes for elongation by attempting lateral movement at each joint.',
      'Lubricate all pins with multi-purpose grease before raising the platform.',
      'Raise and lower the platform 3\xd7 to distribute grease and re-check for noise.',
    ],
  },
];

function diagFindFaultCode(text) {
  var match = text.toUpperCase().match(/\b(HYD|ELC|DRV)-\d{2}\b/);
  return match ? match[0] : null;
}

function diagMatchSymptom(text) {
  var lower = text.toLowerCase();
  var best = null;
  var bestScore = 0;
  for (var i = 0; i < SJ3219_SYMPTOMS.length; i++) {
    var s = SJ3219_SYMPTOMS[i];
    var score = 0;
    for (var j = 0; j < s.keywords.length; j++) {
      if (lower.indexOf(s.keywords[j]) >= 0) score += s.keywords[j].split(' ').length;
    }
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return bestScore > 0 ? best : null;
}

function diagLookupFaultCode(code) {
  return SJ3219_FAULT_CODES[code] || null;
}

function diagGetSection(id) {
  for (var i = 0; i < SJ3219_SECTIONS.length; i++) {
    if (SJ3219_SECTIONS[i].id === id) return SJ3219_SECTIONS[i];
  }
  return null;
}

function diagGenerateResponse(userMessage, ctx) {
  var text = userMessage.trim();

  // 1. Explicit fault code?
  var faultCode = diagFindFaultCode(text);
  if (faultCode && SJ3219_FAULT_CODES[faultCode]) {
    var fc = SJ3219_FAULT_CODES[faultCode];
    var section = diagGetSection(fc.section);
    var symForFc = null;
    for (var i = 0; i < SJ3219_SYMPTOMS.length; i++) {
      if (SJ3219_SYMPTOMS[i].faultCodes.indexOf(faultCode) >= 0) { symForFc = SJ3219_SYMPTOMS[i]; break; }
    }
    return {
      type: 'fault_code',
      faultCode: faultCode,
      title: 'Fault code ' + faultCode + ': ' + fc.title,
      severity: fc.severity,
      body: '**Fault ' + faultCode + '** — ' + fc.title + '\n\n**Most likely causes:**\n' +
        fc.causes.map(function(c, i) { return (i + 1) + '. ' + c; }).join('\n'),
      steps: symForFc ? symForFc.steps : [],
      manualRefs: section ? [section] : [],
      parts: fc.parts,
      machine: 'Skyjack SJIII 3219',
    };
  }

  // 2. Symptom keyword match?
  var symptom = diagMatchSymptom(text);
  if (symptom) {
    var manualRefs = [];
    for (var k = 0; k < symptom.sections.length; k++) {
      var sec = diagGetSection(symptom.sections[k]);
      if (sec) manualRefs.push(sec);
    }
    return {
      type: 'symptom',
      title: symptom.id.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }),
      severity: symptom.severity,
      body: symptom.diagnosis,
      steps: symptom.steps,
      faultCodes: symptom.faultCodes,
      manualRefs: manualRefs,
      parts: symptom.parts,
      machine: 'Skyjack SJIII 3219',
    };
  }

  // 3. Manual section lookup?
  var sectionMatch = null;
  for (var m = 0; m < SJ3219_SECTIONS.length; m++) {
    var words = SJ3219_SECTIONS[m].title.toLowerCase().split(' ');
    for (var w = 0; w < words.length; w++) {
      if (words[w].length > 4 && text.toLowerCase().indexOf(words[w]) >= 0) {
        sectionMatch = SJ3219_SECTIONS[m]; break;
      }
    }
    if (sectionMatch) break;
  }
  if (sectionMatch) {
    return {
      type: 'manual',
      title: 'Manual Reference — ' + sectionMatch.title,
      severity: 'low',
      body: '**Chapter ' + sectionMatch.chapter + ' — ' + sectionMatch.title + '** (p.' + sectionMatch.page + ')\n\n' + sectionMatch.summary,
      steps: [],
      manualRefs: [sectionMatch],
      parts: [],
      machine: 'Skyjack SJIII 3219',
    };
  }

  // 4. Part number lookup?
  var partMatch = text.match(/SKJ-[\w-]+/i);
  if (partMatch) {
    return {
      type: 'parts_lookup',
      title: 'Parts Reference',
      severity: 'low',
      body: 'Looking up part **' + partMatch[0].toUpperCase() + '** in the SJIII 3219 parts catalog. See the part card below for availability and pricing.',
      steps: [],
      manualRefs: [],
      parts: [partMatch[0].toUpperCase()],
      machine: 'Skyjack SJIII 3219',
    };
  }

  // 5. General / unmatched
  return {
    type: 'general',
    title: 'Diagnostic Assistant',
    severity: 'low',
    body: "I'm scoped to the **Skyjack SJIII 3219** service manual and parts database. I can help you with:\n\n- **Fault codes** (e.g. HYD-04, ELC-01, DRV-02)\n- **Symptoms** (e.g. \"won't elevate\", \"platform drifting\", \"won't drive\")\n- **Maintenance intervals** and service procedures\n- **Parts identification** and recommendations\n\nDescribe what you're seeing on the machine and I'll walk through the diagnosis with you.",
    steps: [],
    manualRefs: [],
    parts: [],
    machine: 'Skyjack SJIII 3219',
  };
}

window.SJ3219_SECTIONS = SJ3219_SECTIONS;
window.SJ3219_FAULT_CODES = SJ3219_FAULT_CODES;
window.diagGenerateResponse = diagGenerateResponse;
window.manualPageToPdf = manualPageToPdf;
window.SJIII_MANUAL_PDF = 'manuals/sjiii-operating-manual.pdf';
