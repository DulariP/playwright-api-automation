const fs = require('fs');
const PDFDocument = require('pdfkit');

const OUT = 'Detailed-Framework-Guide.pdf';
const doc = new PDFDocument({ size: 'A4', margins: { top: 58, bottom: 52, left: 54, right: 54 }, bufferPages: true, info: { Title: 'Playwright API Automation Framework — Detailed Guide', Author: 'Framework Documentation' } });
doc.pipe(fs.createWriteStream(OUT));
const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const C = { navy: '#15324B', teal: '#087E8B', aqua: '#DDF3F2', blue: '#E7F0FA', ink: '#253746', muted: '#5F7180', line: '#B8C9D3', pale: '#F3F7F9', gold: '#FFF2D7', green: '#E3F3E9', red: '#FCE8E6', white: '#FFFFFF' };
let pageTitle = 'Detailed Technical Guide';

function page(title) {
  pageTitle = title;
  if (doc.page) doc.addPage();
  doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(19).text(title, { width: W });
  doc.moveDown(.18).strokeColor(C.teal).lineWidth(2).moveTo(54, doc.y).lineTo(54 + W, doc.y).stroke();
  doc.moveDown(.55);
}
function heading(s) { doc.moveDown(.45).fillColor(C.teal).font('Helvetica-Bold').fontSize(12.5).text(s, { width: W }); doc.moveDown(.18); }
function para(s, size=9.4) { doc.fillColor(C.ink).font('Helvetica').fontSize(size).text(s, { width: W, lineGap: 2.2, paragraphGap: 4 }); doc.moveDown(.18); }
function bullet(s) { doc.fillColor(C.teal).font('Helvetica-Bold').fontSize(10).text('•', { continued: true, indent: 8 }); doc.fillColor(C.ink).font('Helvetica').fontSize(9.2).text('  ' + s, { width: W-12, lineGap: 2 }); }
function box(x,y,w,h,label,fill=C.blue,fs=9) {
  doc.roundedRect(x,y,w,h,7).fillAndStroke(fill,C.line);
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(fs).text(label,x+6,y+7,w-12,{align:'center',valign:'center',lineGap:1.5});
}
function arrow(x1,y1,x2,y2,color=C.teal) {
  doc.strokeColor(color).fillColor(color).lineWidth(1.5).moveTo(x1,y1).lineTo(x2,y2).stroke();
  const a=Math.atan2(y2-y1,x2-x1), L=6;
  doc.moveTo(x2,y2).lineTo(x2-L*Math.cos(a-.48),y2-L*Math.sin(a-.48)).lineTo(x2-L*Math.cos(a+.48),y2-L*Math.sin(a+.48)).closePath().fill();
}
function downFlow(items, startY=doc.y, x=142, w=260, h=38, gap=16) {
  items.forEach((it,i)=>{ const y=startY+i*(h+gap); box(x,y,w,h,it.label,it.fill||C.blue,it.fs||9); if(i) arrow(x+w/2,y-gap+2,x+w/2,y); });
  doc.y=startY+items.length*(h+gap)+5;
}
function callout(title, body, fill=C.gold) {
  const y=doc.y, h=doc.heightOfString(body,{width:W-22,font:'Helvetica',fontSize:9.1,lineGap:2})+37;
  doc.roundedRect(54,y,W,h,6).fill(fill);
  doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(9.5).text(title,65,y+9,W-22);
  doc.fillColor(C.ink).font('Helvetica').fontSize(9.1).text(body,65,y+24,W-22,{lineGap:2});
  doc.y=y+h+8;
}
function code(lines) {
  const text=lines.join('\n'), h=doc.heightOfString(text,{width:W-20,font:'Courier',fontSize:8.5,lineGap:2})+18, y=doc.y;
  doc.roundedRect(54,y,W,h,5).fill(C.pale);
  doc.fillColor(C.ink).font('Courier').fontSize(8.5).text(text,64,y+9,W-20,{lineGap:2}); doc.y=y+h+8;
}
function footer() {
  const r=doc.bufferedPageRange();
  for(let i=r.start;i<r.start+r.count;i++){
    doc.switchToPage(i); doc.strokeColor(C.line).lineWidth(.5).moveTo(54,doc.page.height-39).lineTo(doc.page.width-54,doc.page.height-39).stroke();
    doc.fillColor(C.muted).font('Helvetica').fontSize(7.5).text(`PLAYWRIGHT API AUTOMATION  •  ${pageTitle}  •  ${i+1}`,54,doc.page.height-30,{width:W,align:'center',lineBreak:false});
  }
}

// Cover
doc.rect(0,0,doc.page.width,doc.page.height).fill(C.navy);
doc.fillColor(C.white).font('Helvetica-Bold').fontSize(27).text('Playwright API\nAutomation Framework',58,118,{width:470,lineGap:7});
doc.fillColor('#8DE0D8').font('Helvetica-Bold').fontSize(14).text('Detailed Technical Guide',60,222);
doc.fillColor('#E4EDF2').font('Helvetica').fontSize(11).text('A practical map of the test architecture, execution paths, validation, reporting, and CI workflow.',60,264,{width:440,lineGap:5});
doc.roundedRect(60,365,475,170,12).fill('#21465E');
doc.fillColor(C.white).font('Helvetica-Bold').fontSize(12).text('Inside this guide',82,388);
doc.font('Helvetica').fontSize(10).text('Architecture and request lifecycle\nAuthentication and booking CRUD flows\nConfiguration and run commands\nSchemas, contracts, assertions, and reports\nDocker and GitHub Actions pipeline\nRepository-specific notes and troubleshooting',82,416,{lineGap:8});
doc.fillColor('#AFC4D1').font('Helvetica').fontSize(9).text('Based on the repository implementation reviewed 1 October 2026',60,doc.page.height-80);

page('1. Executive overview');
para('This repository is a TypeScript API automation framework using Playwright Test. It sends API requests to a configured external booking service, validates both the HTTP result and the response data, and emits several report formats for local review and CI artifacts. It is a test client: it does not host or start the API being tested.');
heading('What happens during a typical test');
downFlow([
  {label:'Test spec chooses a scenario and prepares data',fill:C.aqua},
  {label:'Playwright fixture provides BookingApi or AuthApi'},
  {label:'API client selects endpoint and validation options'},
  {label:'BaseApi authenticates when needed, sends request, logs result'},
  {label:'AJV schemas, contracts, and test assertions check the result',fill:C.green},
  {label:'Playwright reporters write HTML, JSON, JUnit, and Allure outputs',fill:C.gold}
],doc.y+2,128,300,37,13);
heading('Key design ideas');
bullet('Tests express user-visible API behavior; client classes keep HTTP mechanics reusable.');
bullet('Factories make realistic data and deliberate invalid payloads without repeating object literals.');
bullet('Schemas check data shape while contracts and assertions check endpoint expectations and business values.');
bullet('Environment variables keep endpoints and credentials outside the test source.');

page('2. Architecture and responsibilities');
para('The layers have a clear direction: tests call the API clients, clients inherit shared transport behavior, and helpers provide cross-cutting validation and reporting. Models describe the values passed between layers.');
const x0=62, bw=143, bh=49, gap=13, top=doc.y+5;
box(x0,top,bw,bh,'TEST SPECS\nScenario and assertions',C.aqua); box(x0+bw+gap,top,bw,bh,'FIXTURE + CLIENT\nBookingApi / AuthApi',C.blue); box(x0+2*(bw+gap),top,bw,bh,'BASE API\nHTTP, auth, logs, errors',C.gold);
arrow(x0+bw,top+bh/2,x0+bw+gap,top+bh/2); arrow(x0+2*bw+gap,top+bh/2,x0+2*(bw+gap),top+bh/2);
box(x0+2*(bw+gap),top+86,bw,bh,'PLAYWRIGHT REQUEST\nAPIRequestContext',C.blue); box(x0+bw+gap,top+86,bw,bh,'REMOTE API\n/auth and /booking',C.green);
arrow(x0+2*(bw+gap)+bw/2,top+bh,x0+2*(bw+gap)+bw/2,top+86); arrow(x0+2*(bw+gap),top+86+bh/2,x0+bw+gap+bw,top+86+bh/2);
box(x0,top+86,bw,bh,'SHARED SUPPORT\nSchemas, contracts, models',C.pale);
arrow(x0+bw,top+86+bh/2,x0+bw+gap,top+86+bh/2);
doc.y=top+154;
heading('Responsibility map');
bullet('`api/BaseApi.ts`: request execution, optional token header, payload/response schema checks, diagnostic logs, report attachments, expected-status handling, and one 401 retry.');
bullet('`api/BookingApi.ts` and `api/AuthApi.ts`: endpoint-specific methods and default schemas.');
bullet('`fixtures/apiFixture.ts`: constructs clients using Playwright’s request fixture and labels Allure tests with the environment.');
bullet('`helpers/`: reusable schema/contract validators, required-field checks, booking comparisons, API error formatting, console logs, and attachments.');
bullet('`src/schemas/` and `src/contracts/`: machine-readable payload rules and endpoint-level expectations.');
bullet('`models/`: compile-time shapes; they complement runtime schema validation rather than replacing it.');

page('3. Request lifecycle and authentication');
para('For an authenticated update, BaseApi first asks AuthManager for a token. AuthManager returns its cached token while it is younger than 30 minutes; otherwise it sends credentials to `/auth`. The protected request then carries the token in a Cookie header. A 401 clears the cache and triggers one retry.');
heading('Authenticated request sequence');
const lx=70, rx=365, yy=doc.y+6, nw=160, nh=39;
box(lx,yy,nw,nh,'Test calls updateBooking()',C.aqua); box(rx,yy,nw,nh,'BookingApi selects PUT URL',C.blue);
arrow(lx+nw,yy+nh/2,rx,yy+nh/2);
box(rx,yy+65,nw,nh,'BaseApi requests token',C.gold); arrow(rx+nw/2,yy+nh,rx+nw/2,yy+65);
box(lx,yy+65,nw,nh,'AuthManager cache valid?',C.pale); arrow(rx,yy+65+nh/2,lx+nw,yy+65+nh/2);
box(lx,yy+130,nw,nh,'No: POST /auth, cache token',C.blue); box(rx,yy+130,nw,nh,'Yes: reuse cached token',C.green);
arrow(lx+nw/2,yy+65+nh,lx+nw/2,yy+130); arrow(rx+nw/2,yy+65+nh,rx+nw/2,yy+130);
box(lx,yy+195,2*nw+135,nh,'Send PUT/PATCH/DELETE with Cookie: token=<token>',C.aqua); arrow(lx+nw/2,yy+130+nh,lx+nw/2,yy+195); arrow(rx+nw/2,yy+130+nh,rx+nw/2,yy+195);
box(lx,yy+260,2*nw+135,nh,'Parse body → validate schema → log/attach → return ApiResult or throw',C.green); arrow(lx+nw+67,yy+195+nh,lx+nw+67,yy+260);
doc.y=yy+315;
callout('Important behavior', 'GET and POST are unauthenticated by default in BaseApi. PUT, PATCH, and DELETE default to authentication. updateBookingWithoutAuth explicitly disables it for its 403 test. The token cache is static within the running Node process; independent workers/processes do not share it.');
heading('Response handling');
para('Responses are parsed as JSON where possible, otherwise as text. A response schema is applied only when the HTTP response is successful. If a non-success status equals `expectedStatus`, the result is returned so the test can inspect it; otherwise BaseApi throws a diagnostic error containing method, URL, status, and body. A 401 retry is attempted only for requests marked as authenticated, and it happens once.');

page('4. Booking scenarios as a lifecycle');
para('The booking tests combine isolated checks with a stateful lifecycle. BookingFactory generates different data per run, then the test carries the booking ID returned by creation into the following operations.');
heading('Create → replace → patch → delete');
downFlow([
 {label:'Create booking (POST /booking)\nValidate request + create response',fill:C.aqua},
 {label:'Capture booking ID and verify fields',fill:C.green},
 {label:'Replace full booking (PUT /booking/{id})\nAuthenticated; verify full body',fill:C.blue},
 {label:'Read booking (GET /booking/{id})\nConfirm PUT persisted',fill:C.pale},
 {label:'Patch names only (PATCH /booking/{id})\nCheck changed and retained fields',fill:C.gold},
 {label:'Delete (DELETE /booking/{id})\nExpect status 201',fill:C.red},
 {label:'Read again and expect 404',fill:C.green}
],doc.y+1,130,290,39,10);
heading('What the active specs cover');
bullet('Authentication: valid credentials return a nonempty token; invalid credentials are checked for HTTP 200 and `reason: Bad credentials`.');
bullet('Create: generated booking is posted, response fields and booking content are verified, then GET confirms persistence.');
bullet('Negative create validation: string price, non-boolean depositpaid, and unknown fields should fail local request schema validation before a network request.');
bullet('Missing booking: active GET case asks for a high nonexistent ID and expects 404. The positive GET example is currently commented out.');
bullet('CRUD lifecycle: checks full PUT replacement, PATCH partial update with other fields preserved, delete, and subsequent 404.');
bullet('Authorization: full update without auth is expected to return 403.');

page('5. Configuration and running the suite');
heading('Configuration lookup');
downFlow([
 {label:'TEST_ENV from process; default is qa',fill:C.aqua},
 {label:'dotenv attempts environments/<TEST_ENV>.env\nExisting process variables take precedence',fill:C.blue},
 {label:'BASE_URL builds /auth and /booking endpoint URLs',fill:C.gold},
 {label:'BOOKER_USERNAME + BOOKER_PASSWORD authenticate',fill:C.green}
],doc.y+1,131,290,42,12);
heading('Expected variables');
code(['BASE_URL=https://restful-booker.herokuapp.com','BOOKER_USERNAME=admin','BOOKER_PASSWORD=password123']);
callout('Repository observation', 'The reviewed repository tree does not include an environments/ directory. Supply the values in the shell, CI secrets, or a local environments/qa.env file. Do not commit real credentials.',C.gold);
heading('Useful commands');
code(['npm ci','npm run test:qa','npm run test:staging','npm run test:smoke','npm run test:regression','npx playwright test tests/api/updateBooking.spec.ts','npx playwright test --grep @smoke']);
heading('Execution settings');
para('Playwright discovers tests under `tests/api`. The configured project is Chromium and headless mode. Local execution permits up to four workers; CI uses one worker and retries twice. Trace is collected on the first retry, screenshots on failure, and video is configured on. The global expect timeout is four minutes. The configured reporters are HTML, list, JSON, JUnit, and Allure.');

page('6. Validation: shape, contract, behavior');
para('Three checks serve different purposes. Keeping them separate makes failures easier to interpret and helps avoid relying on TypeScript types for runtime guarantees.');
const ty=doc.y+5, col=[54,218,382], cw=153;
box(col[0],ty,cw,42,'1. JSON Schema\nIs this payload structurally valid?',C.aqua,8.5);
box(col[1],ty,cw,42,'2. API Contract\nDid status/body/headers match?',C.blue,8.5);
box(col[2],ty,cw,42,'3. Test Assertion\nDid the behavior meet intent?',C.green,8.5);
arrow(col[0]+cw,ty+21,col[1],ty+21);arrow(col[1]+cw,ty+21,col[2],ty+21);
doc.y=ty+56;
heading('Where each rule lives');
bullet('Request and response schemas are in `src/schemas/`; AJV with formats checks the runtime payload. `BaseApi` validates a provided request schema before sending, and validates a provided response schema only for successful HTTP responses.');
bullet('Contracts in `src/contracts/` capture expected status, response schema, and optional required headers. `validateContract` checks these against the ApiResult.');
bullet('Assertions in `helpers/apiAssertions.ts` compare status codes, required properties, booking field equality, and basic response conditions.');
bullet('`validateBookingPayload` adds explicit required-field and date-presence checks before the create scenario calls the API.');
heading('Request options and expected errors');
code(['{','  requiresAuth?: boolean,','  expectedStatus?: number,','  requestSchema?: object,','  responseSchema?: object','}']);
callout('Error response pattern', 'For an expected 404, pass expectedStatus: 404 and the error response schema. This prevents BaseApi from throwing solely because the response is non-2xx, so the test can assert the returned status/body.');

page('7. Reports and generated artifacts');
para('Playwright writes each report during a test run. `REPORT_FILE` selects the JSON report basename under `reports/`; `REPORT_FILE_XML` can override the JUnit path. The HTML report folder in the current config is `playwright-report/`.');
heading('Reporting flow');
downFlow([
 {label:'Playwright executes tests and records results',fill:C.aqua},
 {label:'HTML + JSON + JUnit + Allure reporters write artifacts',fill:C.blue},
 {label:'scripts/reportGenerator.ts scans JSON files recursively in reports/',fill:C.gold},
 {label:'Summary counts final result per test and records failures',fill:C.pale},
 {label:'Writes summary.json, email.txt, email-subject.txt, and API_Test_Report.pdf',fill:C.green}
],doc.y+2,113,325,40,12);
heading('Opening reports');
code(['npx playwright show-report playwright-report','npm run allure:generate','npm run allure:open','npm run generate-report']);
callout('Input requirement', 'The summary generator expects Playwright JSON reports under reports/. If there are no JSON inputs, it exits with an error. A generated PDF from that script is a run summary, while this guide PDF documents the framework itself.',C.gold);

page('8. Docker and continuous integration');
para('The Docker image packages the test runner, not the target API. The Compose service injects environment values, runs the test command, and mounts report folders so output remains available on the host.');
heading('CI pipeline map');
downFlow([
 {label:'Trigger: selected pushes, PR to main, daily schedule, or manual run',fill:C.aqua},
 {label:'Build Playwright Docker image',fill:C.blue},
 {label:'Smoke job: --grep @smoke',fill:C.green},
 {label:'Regression job: --grep @regression',fill:C.gold},
 {label:'QA + staging matrix: full suite',fill:C.pale},
 {label:'Upload job artifacts; downstream job aggregates and publishes reports',fill:C.blue},
 {label:'Allure publication and email notification (configured secrets required)',fill:C.green}
],doc.y+1,113,325,39,10);
heading('Container quick start');
code(['docker build -t api-automation .','docker compose run --rm -e TEST_ARGS="--grep @smoke" api-tests']);
heading('Workflow dependencies');
para('The report/publish job consumes artifacts from the test jobs and expects credentials and email-related GitHub secrets to be configured. Review artifact names and paths when maintaining the workflow. The workflow references additional report aggregation inputs and scripts; confirm they exist in the checked-out branch before relying on the publish stage.');

page('9. Repository map and maintenance notes');
const rows=[
['Path','Purpose'],['api/','HTTP clients and common request behavior'],['tests/api/','Executable authentication and booking scenarios'],['fixtures/','Playwright fixture extension and client setup'],['helpers/','Validation, assertions, errors, logs, attachments'],['src/schemas/','AJV request/response JSON schemas'],['src/contracts/','Status, response shape, selected header expectations'],['src/factories/','Generated valid and intentionally invalid input'],['models/','TypeScript API data shapes'],['config/ + constants/','Environment loading and endpoint construction'],['scripts/','Aggregation/report generation'],['Docker + .github/workflows/','Container execution and CI automation']
];
const tx=54, rowH=29, c1=135, c2=W-c1;
rows.forEach((r,i)=>{let y=doc.y;if(i===0){doc.rect(tx,y,W,rowH).fill(C.navy);doc.fillColor(C.white).font('Helvetica-Bold');}else{doc.rect(tx,y,W,rowH).fill(i%2?C.pale:C.white);doc.fillColor(C.ink).font('Helvetica');}doc.fontSize(i===0?9:8.4).text(r[0],tx+8,y+8,c1-12,{lineBreak:false});doc.text(r[1],tx+c1+7,y+8,c2-14,{lineBreak:false});doc.strokeColor(C.line).lineWidth(.4).moveTo(tx,y+rowH).lineTo(tx+W,y+rowH).stroke();doc.y=y+rowH;});
doc.y+=9;
heading('Repository-specific details to remember');
bullet('The implementation uses `BOOKER_USERNAME` / `BOOKER_PASSWORD`; some README examples use `USERNAME` / `PASSWORD`.');
bullet('The README mentions some paths and run commands that differ from the current source tree and Playwright config. Prefer the checked-in code as the runtime reference.');
bullet('The active positive GET-by-ID scenario is commented out; add or restore a positive retrieval check if that coverage is required.');
bullet('Invalid login is asserted as a 200 response with an error reason. This matches the test’s current expectation and should be kept aligned with the service behavior.');

page('10. Troubleshooting and extension guide');
heading('Common failure paths');
bullet('Configuration error or malformed URL: confirm `TEST_ENV`, `BASE_URL`, and credentials are visible to the Node process. Remember dotenv does not overwrite existing process variables.');
bullet('401 on update/patch/delete: verify credentials and token cookie format. AuthManager refreshes once after an authenticated 401; repeated failure is returned as an API error.');
bullet('Request schema error: the payload was rejected locally before HTTP. Compare the factory output to the schema and inspect AJV’s reported field/path.');
bullet('Response schema or contract failure: inspect actual status/body/headers from the attached API log and compare with the endpoint schema/contract.');
bullet('No consolidated report: confirm at least one Playwright JSON report exists under `reports/` and uses the expected Playwright format.');
bullet('Docker outputs missing: verify the Compose bind mounts and that the container wrote into the mounted directories.');
heading('Adding a new endpoint scenario');
downFlow([
 {label:'Define input/output interfaces in models/',fill:C.pale},
 {label:'Add or update JSON Schema and contract',fill:C.blue},
 {label:'Add a focused method to the relevant API client',fill:C.aqua},
 {label:'Expose any shared setup via the Playwright fixture',fill:C.gold},
 {label:'Write scenario + negative cases in tests/api/',fill:C.green},
 {label:'Run locally, inspect logs, and verify report outputs',fill:C.pale}
],doc.y+1,131,290,36,9);

footer();
doc.end();
