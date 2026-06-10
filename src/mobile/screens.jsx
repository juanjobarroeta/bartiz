/**
 * DECOLSA mobile PWA screens — ported from the design handoff
 * (`mobile-screens.jsx`). Inicio + Proyectos consume the live project list
 * (passed down from MobileApp); the remaining figures use the documented
 * sample block in `sampleData.js`.
 */

import { useState } from 'react'
import { Icon, BrandGlyph } from '../components/ds/Icon'
import { SCurve, Gauge } from '../components/ds/Charts'
import { money, compactMoney, MoneyParts } from '../lib/format'
import { DATA, MOVS } from './sampleData'

/* ============ INICIO (dashboard) ============ */
export function MInicio({ projects, totals, banks, saldoTotal, go, openProject, openSheet, approved, greetName }) {
  const t = totals
  const pendientesCount =
    (approved['pre-platino'] ? 0 : 1) + (approved['pre-tp01'] ? 0 : 1) + (approved['est-2'] ? 0 : 1)
  return (
    <div className="m-scroll">
      <div className="m-head">
        <div className="m-brandmark"><BrandGlyph id="tower" style={{ width: 21, height: 21 }} /></div>
        <div>
          <div className="greet">Buenos días{greetName ? `, ${greetName}` : ''}</div>
          <h1>Resumen</h1>
        </div>
        <button className="hbtn" onClick={() => go('mas')}><Icon name="bell" /><span className="dot" /></button>
      </div>

      <div className="m-pad">
        <div className="m-hero">
          <div className="lbl"><span className="ic"><Icon name="briefcase" /></span>Valor de cartera · Contratado</div>
          <div className="val"><MoneyParts value={t.contratado} /></div>
          <div className="meta">
            <span className="updelta"><Icon name="arrowUp" />18%</span>
            <span>vs. trimestre anterior</span>
            <span style={{ marginLeft: 'auto' }}>{t.activos} activos</span>
          </div>
        </div>

        <div className="m-kpis">
          <div className="m-kpi">
            <div className="ktop"><span className="kic"><Icon name="receipt" /></span><span className="klbl">Facturado</span></div>
            <div className="kval">{money(t.facturado)}</div>
            <div className="ksub">0.9% del contrato</div>
          </div>
          <div className="m-kpi">
            <div className="ktop"><span className="kic green"><Icon name="bank" /></span><span className="klbl">Saldo en bancos</span></div>
            <div className="kval"><MoneyParts value={saldoTotal} /></div>
            <div className="ksub">2 cuentas · 343 sin conciliar</div>
          </div>
          <div className="m-kpi">
            <div className="ktop"><span className="kic blue"><Icon name="target" /></span><span className="klbl">Rendimiento</span></div>
            <div className="kval">{t.rendimiento}%</div>
            <div className="ksub">Ganado {compactMoney(t.valorGanado)}</div>
          </div>
          <div className="m-kpi">
            <div className="ktop"><span className="kic"><Icon name="clock" /></span><span className="klbl">Por cobrar</span></div>
            <div className="kval">{compactMoney(t.contratado - t.facturado)}</div>
            <div className="ksub">cartera pendiente</div>
          </div>
        </div>

        {pendientesCount > 0 && (
          <div style={{ marginTop: 18 }}>
            <button className="m-attn" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('pendientes')}>
              <span className="aic"><Icon name="check" /></span>
              <span>
                <div className="atxt"><b>{pendientesCount}</b> {pendientesCount === 1 ? 'pendiente requiere' : 'pendientes requieren'} tu aprobación</div>
                <div className="asub">Presupuestos y estimaciones por revisar</div>
              </span>
              <span className="ago"><Icon name="arrowRight" /></span>
            </button>
          </div>
        )}

        <div className="m-sec"><h2>Cartera de proyectos</h2><span className="more" onClick={() => go('proyectos')}>Ver todo <Icon name="chevronRight" /></span></div>
        <div className="m-card">
          {projects.map((p, i) => (
            <div key={p.code}>
              <button className="m-proj" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: i ? '1px solid var(--line)' : 'none' }} onClick={() => openProject(p)}>
                <span className="pbadge" style={{ background: p.color }}>{p.short}</span>
                <span style={{ minWidth: 0 }}>
                  <div className="pname">{p.name}</div>
                  <div className="pcode">{p.code}</div>
                </span>
                <span className="pright">
                  <div className="pamt">{p.contratado ? compactMoney(p.contratado) : '—'}</div>
                  {p.porCobrar > 0 && <div className="pcobrar">{money(p.porCobrar)} x cobrar</div>}
                </span>
              </button>
              <div className="m-proj-prog">
                <div className="ptop">
                  <span className="ppct" style={{ color: p.avance > 0 ? 'var(--pos)' : 'var(--ink-3)' }}>{p.avance.toFixed(1)}% avance</span>
                  {p.plan > 0 && <span className="pplan">plan {p.plan.toFixed(0)}%</span>}
                </div>
                <div className="m-track">
                  <div className="fill" style={{ width: Math.max(p.avance, 1.5) + '%', background: p.avance > 0 ? 'var(--pos)' : 'var(--line-2)' }} />
                  {p.plan > 0 && <div className="mark" style={{ left: p.plan + '%' }} />}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="m-sec"><h2>Posición de efectivo</h2><span className="more" onClick={() => go('tesoreria')}>Detalle <Icon name="chevronRight" /></span></div>
        <div className="m-card">
          {banks.map((b, i) => (
            <div className="m-bank" key={i}>
              <div className="bic"><Icon name="bank" /></div>
              <div><div className="bnm">{b.name} {b.sub}</div><div className="bmeta">··{b.acct.slice(-4)} · {b.mov} mov.</div></div>
              <div className={'bv' + (b.balance < 0 ? ' neg' : '')}>{b.balance < 0 ? '−' : ''}{money(Math.abs(b.balance))}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ============ PROYECTOS ============ */
export function MProyectos({ projects, openProject }) {
  return (
    <div className="m-scroll">
      <div className="m-head"><div><div className="greet">{projects.length} en cartera</div><h1>Proyectos</h1></div></div>
      <div className="m-pad">
        <div className="m-search"><Icon name="search" />Buscar proyecto…</div>
        <div className="m-card" style={{ marginTop: 14 }}>
          {projects.map((p, i) => (
            <button key={p.code} className="m-proj" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: i ? '1px solid var(--line)' : 'none', padding: 16 }} onClick={() => openProject(p)}>
              <span className="pbadge" style={{ background: p.color }}>{p.short}</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <div className="pname">{p.name}</div>
                <div className="pcode">{p.code}{p.location ? ` · ${p.location}` : ''}</div>
                <div style={{ marginTop: 7 }}><span className={'m-status ' + p.status}><span className="d" />{p.statusLabel || (p.status === 'active' ? 'En obra' : 'Planeación')}</span></div>
              </span>
              <span className="pright">
                <div className="pamt">{p.contratado ? compactMoney(p.contratado) : '—'}</div>
                <div className="pcode" style={{ marginTop: 2 }}>{p.estimaciones} est · {p.presupuestos} pre</div>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ============ PROJECT DETAIL ============ */
export function MProjectDetail({ project, back, openSheet, approved }) {
  const p = DATA.platino
  const hero = project || p
  const [tab, setTab] = useState('resumen')
  const est2Approved = approved['est-2']
  return (
    <div className="m-scroll" style={{ paddingTop: 54 }}>
      <div className="m-back"><button onClick={back}><Icon name="arrowLeft" />Proyectos</button></div>
      <div className="m-pad">
        <div className="m-dhero">
          <div className="db" style={{ background: hero.color }}>{hero.short || hero.name?.[0]}</div>
          <div style={{ minWidth: 0 }}>
            <div className="dcode">{hero.code}</div>
            <h1>{hero.name}</h1>
            <div className="m-dtags">
              <span className={'m-status ' + (hero.status || 'active')}><span className="d" />{hero.statusLabel || (hero.status === 'plan' ? 'Planeación' : 'En obra')}</span>
              {hero.location && <span className="m-loc"><Icon name="mapPin" />{hero.location}</span>}
            </div>
          </div>
        </div>

        <div className="m-metrics">
          <div className="m-metric accent"><div className="ml">Contratado</div><div className="mv">{compactMoney(hero.contratado)}</div></div>
          <div className="m-metric"><div className="ml">Facturado</div><div className="mv">{money(p.facturado)}</div></div>
          <div className="m-metric"><div className="ml">Costo ejec.</div><div className="mv dim">—</div></div>
          <div className="m-metric"><div className="ml">Gastado</div><div className="mv">{money(p.gastado)}</div></div>
          <div className="m-metric"><div className="ml">Cobrado</div><div className="mv">{money(p.cobrado)}</div></div>
        </div>

        <div className="m-seg">
          <button className={tab === 'resumen' ? 'active' : ''} onClick={() => setTab('resumen')}>Resumen</button>
          <button className={tab === 'estimaciones' ? 'active' : ''} onClick={() => setTab('estimaciones')}>Estim.<span className="c">2</span></button>
          <button className={tab === 'programa' ? 'active' : ''} onClick={() => setTab('programa')}>Programa</button>
        </div>

        {tab === 'resumen' && (
          <>
            <div className="m-sec"><h2>Flujo de cobranza</h2><span className="hint">Corte {p.contrato.corte}</span></div>
            <div className="m-card">
              {p.flujo.map((f) => (
                <div key={f.k} className={'m-flujo-row' + (f.hl ? ' hl' : '')}>
                  <div className="k">{f.k}</div><div className="l">{f.l}</div><div className="v">{money(f.v)}</div>
                </div>
              ))}
            </div>
            <div className="m-sec"><h2>Presupuesto contratado</h2></div>
            <div className="m-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.presupuesto.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }} className="mono">{p.presupuesto.partidas.toLocaleString()} partidas · {p.presupuesto.estado}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 15 }}>
                <div><div className="eyebrow">Subtotal</div><div className="num" style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{compactMoney(p.presupuesto.subtotal)}</div></div>
                <div><div className="eyebrow">IVA</div><div className="num" style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{compactMoney(p.presupuesto.iva)}</div></div>
                <div><div className="eyebrow">Total</div><div className="num" style={{ fontWeight: 700, fontSize: 15, marginTop: 4, color: 'var(--brand-strong)' }}>{compactMoney(p.presupuesto.total)}</div></div>
              </div>
            </div>
          </>
        )}

        {tab === 'estimaciones' && (
          <>
            <div className="m-sec"><h2>Estimaciones</h2><span className="hint">73 partidas</span></div>
            <div className="m-card">
              {p.estimaciones.map((e) => {
                const isDraft = e.estado === 'BORRADOR'
                const done = e.no === 2 && est2Approved
                return (
                  <div className="m-est" key={e.no}>
                    <div className="etop">
                      <span className="enm">{e.nm}</span>
                      <span className="eno">#{String(e.no).padStart(2, '0')}</span>
                      <span style={{ marginLeft: 'auto' }} className={'m-status ' + (done || e.estado === 'APROBADA' ? 'active' : 'plan')}><span className="d" />{done || e.estado === 'APROBADA' ? 'Aprobada' : 'Borrador'}</span>
                    </div>
                    <div className="egrid">
                      <div><div className="el">Importe</div><div className="ev">{money(e.importe)}</div></div>
                      <div><div className="el">% Periodo</div><div className="ev">{e.pct.toFixed(2)}%</div></div>
                      <div><div className="el">Acumulado</div><div className="ev">{compactMoney(e.acum)}</div></div>
                    </div>
                    {isDraft && !done && (
                      <div className="eact">
                        <button className="m-btn m-btn-ghost" onClick={() => openSheet({ type: 'est-review', id: 'est-2' })}>Revisar</button>
                        <button className="m-btn m-btn-approve" onClick={() => openSheet({ type: 'est', id: 'est-2', name: 'EST. 2 — Platino 2br', amount: 109350 })}><Icon name="check" />Aprobar</button>
                      </div>
                    )}
                    {done && <div className="m-done-tag"><Icon name="check" />Aprobada por ti · hoy</div>}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'programa' && (
          <>
            <div className="m-sec"><h2>Avance gráfico</h2><span className="hint">Curva S</span></div>
            <div className="m-card" style={{ padding: '16px 8px 12px' }}>
              <div style={{ display: 'flex', gap: 16, padding: '0 8px 12px' }}>
                <div><div className="eyebrow">Real acum.</div><div className="num" style={{ fontWeight: 700, fontSize: 18, color: 'var(--pos)' }}>{p.programa.realAcum.toFixed(1)}%</div></div>
                <div><div className="eyebrow">Programado</div><div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{p.programa.programado.toFixed(0)}%</div></div>
                <div><div className="eyebrow">Contrato</div><div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{compactMoney(p.programa.totalContrato)}</div></div>
              </div>
              <SCurve curve={p.curve} height={210} />
              <div style={{ display: 'flex', gap: 16, padding: '6px 8px 0', justifyContent: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}><span style={{ width: 14, height: 3, background: '#2A241F', borderRadius: 2 }} />Programado</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}><span style={{ width: 14, height: 3, background: '#2F7D56', borderRadius: 2 }} />Real</span>
              </div>
            </div>
            <div className="m-sec"><h2>Rendimiento</h2></div>
            <div className="m-card m-gauge-wrap">
              <Gauge pct={89} size={96} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--brand)' }} />Valor ganado</div>
                <div className="num" style={{ fontWeight: 700, fontSize: 17, margin: '2px 0 10px' }}>$64,765</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: '#EFE9DF' }} />Valor planeado</div>
                <div className="num" style={{ fontWeight: 700, fontSize: 17, marginTop: 2, color: 'var(--ink-2)' }}>$72,940</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ============ TESORERÍA ============ */
export function MTesoreria({ banks, saldoTotal, openSheet, conciliated }) {
  const [filter, setFilter] = useState('sin')
  const [bank, setBank] = useState(0)
  const list = MOVS.filter((m) => {
    const matched = conciliated[m.id]
    if (filter === 'sin') return !matched
    if (filter === 'con') return matched
    return true
  })
  return (
    <div className="m-scroll">
      <div className="m-head"><div><div className="greet">Empresa · {banks.length} cuentas</div><h1>Tesorería</h1></div><div className="avatar">JB</div></div>
      <div className="m-pad">
        <div className="m-saldo">
          <div className="lbl">Saldo total operativo</div>
          <div className="v"><MoneyParts value={saldoTotal} /></div>
        </div>
        <div className="m-card" style={{ marginTop: 12 }}>
          {banks.map((b, i) => (
            <button key={i} className="m-bank" style={{ width: '100%', background: bank === i ? 'var(--brand-tint)' : 'none', border: 'none', borderTop: i ? '1px solid var(--line)' : 'none', textAlign: 'left' }} onClick={() => setBank(i)}>
              <div className="bic" style={bank === i ? { background: 'var(--brand-soft)', color: 'var(--brand-strong)' } : {}}><Icon name="bank" /></div>
              <div><div className="bnm">{b.name} {b.sub}</div><div className="bmeta">··{b.acct.slice(-4)} · {b.mov} mov.</div></div>
              <div className={'bv' + (b.balance < 0 ? ' neg' : '')}>{b.balance < 0 ? '−' : ''}{money(Math.abs(b.balance))}</div>
            </button>
          ))}
        </div>

        <div className="m-chips" style={{ marginTop: 16 }}>
          {[['sin', 'Sin conciliar', 343], ['con', 'Conciliados', 0], ['todos', 'Todos', 343]].map(([k, l, c]) => (
            <button key={k} className={'m-chip' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>{l}{c > 0 && <span className="c">{c}</span>}</button>
          ))}
        </div>

        <div className="m-card" style={{ marginTop: 14 }}>
          {list.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13.5 }}>Nada por aquí.</div>}
          {list.map((m) => {
            const matched = conciliated[m.id]
            return (
              <button key={m.id} className="m-mov" style={{ width: '100%', background: 'none', border: 'none', borderTop: '1px solid var(--line)', textAlign: 'left' }} onClick={() => !matched && openSheet({ type: 'conciliar', id: m.id, name: m.desc, amount: m.amt })}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="mdesc">{m.desc}</div>
                  <div className="mref">{m.ref}</div>
                  {matched && <div className="m-done-tag" style={{ marginTop: 6 }}><Icon name="check" />Conciliado</div>}
                </div>
                <div className="mr">
                  <div className={'mamt ' + (m.amt < 0 ? 'neg' : 'pos')}>{m.amt < 0 ? '−' : '+'}{money(Math.abs(m.amt))}</div>
                  <div className="mdate">{m.d}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ============ PENDIENTES (approvals inbox) ============ */
export function MPendientes({ openSheet, approved, go }) {
  const items = [
    { id: 'pre-platino', kind: 'pre', ic: 'file', tone: 'brand', title: 'Presupuesto — Platino 2br', sub: '2,090 partidas · V1', amount: 12734752, approveName: 'Presupuesto Platino 2br' },
    { id: 'pre-tp01', kind: 'pre', ic: 'file', tone: 'brand', title: 'Presupuesto — Torres Platino', sub: '1,840 partidas · V1', amount: 15515510, approveName: 'Presupuesto Torres Platino' },
    { id: 'est-2', kind: 'est', ic: 'edit', tone: 'info', title: 'Estimación EST. 2 — Platino 2br', sub: 'Borrador · corte 9 jun 2026', amount: 109350, approveName: 'EST. 2 — Platino 2br' },
  ]
  const pending = items.filter((i) => !approved[i.id])
  const done = items.filter((i) => approved[i.id])
  return (
    <div className="m-scroll">
      <div className="m-head"><div><div className="greet">{pending.length} por aprobar</div><h1>Pendientes</h1></div></div>
      <div className="m-pad">
        {pending.length > 0 ? (
          <>
            <div className="m-sec" style={{ paddingTop: 8 }}><h2>Requiere tu aprobación</h2></div>
            <div className="m-card">
              {pending.map((it) => (
                <div className="m-inbox-item" key={it.id}>
                  <div className="itop">
                    <div className={'iic ' + it.tone}><Icon name={it.ic} /></div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="ititle">{it.title}</div>
                      <div className="isub">{it.sub}</div>
                    </div>
                    <div className="iamt">{compactMoney(it.amount)}</div>
                  </div>
                  <div className="iact">
                    <button className="m-btn m-btn-ghost" onClick={() => openSheet({ type: it.kind === 'pre' ? 'pre-review' : 'est-review', id: it.id })}>Revisar</button>
                    <button className="m-btn m-btn-approve" onClick={() => openSheet({ type: it.kind, id: it.id, name: it.approveName, amount: it.amount })}><Icon name="check" />Aprobar</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div className="m-sheet-success" style={{ padding: 0 }}><div className="check"><Icon name="check" /></div></div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>Todo al día</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13.5, marginTop: 4 }}>No hay aprobaciones pendientes.</div>
          </div>
        )}

        <div className="m-sec"><h2>Conciliación bancaria</h2></div>
        <button className="m-attn" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('tesoreria')}>
          <span className="aic" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}><Icon name="shuffle" /></span>
          <span>
            <div className="atxt"><b>343</b> movimientos sin conciliar</div>
            <div className="asub">BBVA Concentradora · Operaciones</div>
          </span>
          <span className="ago" style={{ background: 'var(--warn)' }}><Icon name="arrowRight" /></span>
        </button>

        {done.length > 0 && (
          <>
            <div className="m-sec"><h2>Aprobados hoy</h2></div>
            <div className="m-card">
              {done.map((it) => (
                <div className="m-inbox-item" key={it.id}>
                  <div className="itop">
                    <div className="iic" style={{ background: 'var(--pos-soft)', color: 'var(--pos)' }}><Icon name="check" /></div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="ititle">{it.title}</div>
                      <div className="m-done-tag" style={{ marginTop: 4 }}><Icon name="check" />Aprobado por ti</div>
                    </div>
                    <div className="iamt">{compactMoney(it.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ============ MÁS ============ */
export function MMas({ company, user, modules = [], onOpenModule, onLogout }) {
  const initials = (user?.name || user?.email || 'JB')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
  return (
    <div className="m-scroll">
      <div className="m-head"><div><div className="greet">Cuenta</div><h1>Más</h1></div></div>
      <div className="m-pad">
        <div className="m-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>{initials || 'JB'}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{company?.razonSocial || 'DECOLSA Ingeniería'}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{user?.email || ''}</div>
            {company?.rfc && <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{company.rfc}</div>}
          </div>
        </div>
        <div className="m-card" style={{ marginTop: 14 }}>
          {modules.map(([ic, l, route], i) => (
            <button
              key={l}
              className="m-row"
              onClick={() => onOpenModule?.(route)}
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', borderTop: i ? '1px solid var(--line)' : 'none' }}
            >
              <div className="ric"><Icon name={ic} /></div>
              <div className="rlbl">{l}</div>
              <div className="rchev"><Icon name="chevronRight" /></div>
            </button>
          ))}
        </div>
        <div className="m-card" style={{ marginTop: 14 }}>
          <a className="m-row" href="https://contabilidad-os-production.up.railway.app" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="ric"><Icon name="external" /></div><div className="rlbl">Conectado a contabilidad-os</div><div className="rchev"><Icon name="chevronRight" /></div>
          </a>
          <button className="m-row" onClick={onLogout} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', borderTop: '1px solid var(--line)' }}>
            <div className="ric" style={{ color: 'var(--neg)' }}><Icon name="logout" /></div><div className="rlbl" style={{ color: 'var(--neg)' }}>Cerrar sesión</div>
          </button>
        </div>
      </div>
    </div>
  )
}
