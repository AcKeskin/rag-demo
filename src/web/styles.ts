export const STYLES = `
:host{--bg:#17181a;--panel:#1f2023;--line:#34363b;--ink:#e9e6df;--mute:#9a978f;--accent:#f0a23b;--on-accent:#1a1205;
  --mono:"DM Mono",ui-monospace,monospace;--sans:"Barlow",system-ui,sans-serif;
  display:block;color:var(--ink);font:16px/1.55 var(--sans)}
*{box-sizing:border-box;margin:0}
.box{position:relative;background:var(--panel);border:1px solid var(--line);padding:20px;display:grid;gap:14px}
.hud{font:500 12px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.top{display:flex;justify-content:space-between;gap:12px}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);margin-right:8px;vertical-align:1px}
.log{display:grid;gap:14px;max-height:420px;overflow-y:auto}
.q{color:var(--accent);font:500 14px var(--mono)}
.a{white-space:normal}
.a.wait{color:var(--mute)}
.cite{color:var(--on-accent);background:var(--accent);font:500 10px var(--mono);padding:1px 4px;margin-left:2px;cursor:default}
.src{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.src a,.src span{font:500 11px var(--mono);color:var(--mute);border:1px solid var(--line);padding:2px 6px}
.src a:hover{color:var(--ink);border-color:var(--mute)}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips button{font:500 12px var(--mono);color:var(--ink);background:none;border:1px solid var(--line);padding:6px 10px;cursor:pointer}
.chips button:hover{border-color:var(--accent)}
form{display:flex;gap:8px}
input{flex:1;min-width:0;background:var(--bg);color:var(--ink);border:1px solid var(--line);padding:10px 12px;font:15px var(--sans)}
input:focus{outline:none;border-color:var(--accent)}
form button{background:var(--accent);color:var(--on-accent);border:0;padding:0 16px;font:600 13px var(--mono);text-transform:uppercase;cursor:pointer}
form button:disabled{opacity:.5;cursor:wait}
`;
