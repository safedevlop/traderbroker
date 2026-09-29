import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

const initialStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 226.84, change: 1.42, color: '#a8d8ff' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 138.21, change: 2.87, color: '#8df0ba' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 507.62, change: -0.34, color: '#b8c6ff' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 231.19, change: 0.68, color: '#f1c58d' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 348.62, change: -1.18, color: '#f3a9ad' },
  { symbol: 'META', name: 'Meta Platforms', price: 585.14, change: 0.91, color: '#9bb9ef' },
]
const icons = { grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', search: 'm21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z', chart: 'M4 19V5m0 14h16M7 15l3-4 3 2 5-7', wallet: 'M4 7h16v12H4zM4 7V5h13M16 13h2', repeat: 'M17 2l4 4-4 4M3 6h18M7 22l-4-4 4-4M21 18H3', activity: 'M3 12h4l2-7 4 14 2-7h6', user: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0-0-8 4 4 0 0 0 0 8Z', arrow: 'M5 12h14m-6-6 6 6-6 6', star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z' }
function Icon({ name, size = 18 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name]} /></svg> }
function Sparkline({ negative = false, large = false }) { return <svg className={`sparkline ${large ? 'large' : ''}`} viewBox="0 0 90 24" preserveAspectRatio="none" aria-hidden="true"><polyline points={negative ? '0,10 10,12 20,8 30,14 40,11 50,16 60,12 70,18 80,16 90,21' : '0,19 10,16 20,18 30,12 40,14 50,8 60,10 70,5 80,8 90,2'} fill="none" stroke={negative ? '#e8787e' : '#49d58a'} strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg> }

function Auth() {
  const [signUp, setSignUp] = useState(false); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); const result = signUp ? await supabase.auth.signUp({ email, password, options: { data: { display_name: name || 'Tradingbird' } } }) : await supabase.auth.signInWithPassword({ email, password }); setBusy(false); if (result.error) setError(result.error.message); else if (signUp && !result.data.session) setError('Check your email to confirm your account.') }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><div className="brand"><span className="brand-mark">✦</span> startrade</div><p className="eyebrow">{signUp ? 'Create account' : 'Welcome back'}</p><h1>{signUp ? 'Start trading smarter.' : 'Sign in to your account.'}</h1><p className="panel-subtitle">Access your portfolio, watchlist and paper-trading account.</p>{signUp && <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tradingbird" /></label>}<label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Password<input required minLength="6" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="auth-error">{error}</p>}<button className="save-settings" disabled={busy}>{busy ? 'Please wait…' : signUp ? 'Create account' : 'Sign in'}</button><button type="button" className="text-button auth-switch" onClick={() => { setSignUp(!signUp); setError('') }}>{signUp ? 'Already have an account? Sign in' : 'New to startrade? Create an account'}</button></form></main>
}

function App() {
  const [session, setSession] = useState(null); const [profile, setProfile] = useState(null); const [account, setAccount] = useState(null); const [holdings, setHoldings] = useState([]); const [watchlist, setWatchlist] = useState([]); const [transactions, setTransactions] = useState([]); const [orders, setOrders] = useState([])
  const [stocks, setStocks] = useState(initialStocks); const [selected, setSelected] = useState('AAPL'); const [orderSide, setOrderSide] = useState('Buy'); const [quantity, setQuantity] = useState('1'); const [activeNav, setActiveNav] = useState('Overview'); const [query, setQuery] = useState(''); const [toast, setToast] = useState(''); const [deposit, setDeposit] = useState(''); const [name, setName] = useState('')
  const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const current = stocks.find((stock) => stock.symbol === selected) || stocks[0]
  const shares = (symbol) => Number(holdings.find((item) => item.symbol === symbol)?.shares || 0)
  const portfolioValue = stocks.reduce((sum, stock) => sum + stock.price * shares(stock.symbol), 0)
  const filteredStocks = stocks.filter((stock) => `${stock.symbol} ${stock.name}`.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSession(data.session)); const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next)); return () => listener.subscription.unsubscribe() }, [])
  const refreshAccount = useCallback(async (accountId) => {
    if (!session || !accountId) return
    const [accountResult, holdingsResult, transactionsResult, ordersResult] = await Promise.all([
      supabase.from('accounts').select('*').eq('id', accountId).eq('user_id', session.user.id).single(),
      supabase.from('holdings').select('*').eq('account_id', accountId).order('symbol'),
      supabase.from('transactions').select('*').eq('account_id', accountId).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('account_id', accountId).order('created_at', { ascending: false }),
    ])
    const failed = [accountResult, holdingsResult, transactionsResult, ordersResult].find((result) => result.error)
    if (failed?.error) {
      setToast(failed.error.message)
      return
    }
    setAccount(accountResult.data)
    setHoldings(holdingsResult.data || [])
    setTransactions(transactionsResult.data || [])
    setOrders(ordersResult.data || [])
  }, [session])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      const uid = session.user.id
      const [p, a, w] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('accounts').select('*').eq('user_id', uid).single(),
        supabase.from('watchlist_items').select('*').eq('user_id', uid),
      ])
      if (cancelled) return
      const failed = [p, a, w].find((result) => result.error)
      if (failed?.error) {
        setToast(failed.error.message)
        return
      }
      setProfile(p.data)
      setName(p.data?.display_name || 'Tradingbird')
      setWatchlist((w.data || []).map((item) => item.symbol))
      setAccount(a.data)
      await refreshAccount(a.data?.id)
    })()
    return () => { cancelled = true }
  }, [refreshAccount, session])
  useEffect(() => { const timer = setInterval(() => setStocks((items) => items.map((stock) => ({ ...stock, price: Math.max(1, stock.price + (Math.random() - .48) * .46) }))), 2200); return () => clearInterval(timer) }, [])
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer) }, [toast])
  if (!session) return <Auth />
  const toggleWatch = async (symbol) => { if (watchlist.includes(symbol)) { await supabase.from('watchlist_items').delete().eq('user_id', session.user.id).eq('symbol', symbol); setWatchlist((items) => items.filter((item) => item !== symbol)) } else { const { error } = await supabase.from('watchlist_items').insert({ user_id: session.user.id, symbol }); if (!error) setWatchlist((items) => [...items, symbol]) } }
  const placeOrder = async () => {
    const amount = Number(quantity)
    if (!amount || amount < 1) return setToast('Enter at least 1 share.')
    if (!account) return setToast('Your trading account is still loading.')
    const { error } = await supabase.rpc('place_paper_order', {
      p_account_id: account.id,
      p_symbol: current.symbol,
      p_side: orderSide.toLowerCase(),
      p_shares: amount,
      p_price: current.price,
      p_order_type: 'market',
    })
    if (error) return setToast(error.message)
    await refreshAccount(account.id)
    setToast(`${orderSide} order placed for ${amount} ${current.symbol}`)
  }
  const addFunds = async () => {
    const amount = Number(deposit)
    if (!amount || amount <= 0) return setToast('Enter a valid deposit amount.')
    if (!account) return setToast('Your trading account is still loading.')
    const { error } = await supabase.rpc('deposit_funds', { p_account_id: account.id, p_amount: amount })
    if (error) return setToast(error.message)
    await refreshAccount(account.id)
    setDeposit('')
    setToast(`${money(amount)} added to your buying power`)
  }
  const saveProfile = async () => { const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', session.user.id); setToast(error ? error.message : 'Settings saved successfully') }
  const selectStock = (symbol) => { setSelected(symbol); setActiveNav('Markets') }
  const nav = [['Overview', 'grid'], ['Markets', 'chart'], ['Portfolio', 'wallet'], ['Activity', 'repeat'], ['Watchlist', 'star'], ['Profile & settings', 'user']]
  const renderContent = () => {
    if (activeNav === 'Markets' || activeNav === 'Watchlist') return <section className="full-page panel"><div className="panel-header"><div><h2>{activeNav}</h2><p className="panel-subtitle">Explore live prices across your favorite companies</p></div><label className="inline-search"><Icon name="search" size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter stocks" /></label></div><div className="markets-grid">{filteredStocks.filter((stock) => activeNav === 'Markets' || watchlist.includes(stock.symbol)).map((stock) => <button className="market-card" key={stock.symbol} onClick={() => selectStock(stock.symbol)}><div className="market-card-top"><span className="asset-cell"><span className="stock-logo" style={{ background: stock.color }}>{stock.symbol[0]}</span><span><strong>{stock.symbol}</strong><small>{stock.name}</small></span></span><button className="star-button" onClick={(e) => { e.stopPropagation(); toggleWatch(stock.symbol) }}>{watchlist.includes(stock.symbol) ? '★' : '☆'}</button></div><div className="market-card-price"><strong>{money(stock.price)}</strong><span className={stock.change >= 0 ? 'positive' : 'negative'}>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%</span></div><Sparkline negative={stock.change < 0} large /></button>)}</div></section>
    if (activeNav === 'Portfolio') return <><section className="summary-grid"><div className="summary-card balance-card"><div className="card-label">Portfolio value</div><div className="balance-value">{money(portfolioValue)}</div><div className="card-note">Invested positions</div></div><div className="summary-card"><div className="card-label">Buying power</div><div className="metric-value">{money(account?.cash_balance)}</div><div className="card-note">Available to invest</div></div><div className="summary-card"><div className="card-label">Add funds</div><div className="input-wrap"><input type="number" min="1" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="Amount" /><button className="fund-button" onClick={addFunds}>Deposit</button></div></div></section><section className="full-page panel"><div className="panel-header"><div><h2>Holdings</h2><p className="panel-subtitle">Your positions and performance</p></div></div><div className="holdings-table">{holdings.filter((item) => Number(item.shares) > 0).map((item) => { const stock = stocks.find((s) => s.symbol === item.symbol) || { ...initialStocks[0], symbol: item.symbol }; return <div className="holding-detail" key={item.id}><span className="asset-cell"><span className="stock-logo" style={{ background: stock.color }}>{item.symbol[0]}</span><span><strong>{item.symbol}</strong><small>{stock.name}</small></span></span><span><small>Shares</small><strong>{item.shares}</strong></span><span><small>Avg. price</small><strong>{money(item.average_price)}</strong></span><span><small>Market value</small><strong>{money(stock.price * item.shares)}</strong></span><button className="text-button" onClick={() => selectStock(item.symbol)}>Trade <Icon name="arrow" size={14} /></button></div> })}</div></section></>
    if (activeNav === 'Activity') return <section className="full-page panel activity-page"><div className="panel-header"><div><h2>Activity</h2><p className="panel-subtitle">Your recent account activity</p></div></div><div className="activity-list">{transactions.map((item) => <div className="activity-row" key={item.id}><span className="activity-icon positive"><Icon name={item.type === 'deposit' ? 'wallet' : 'chart'} size={15} /></span><span><strong>{item.description || item.type}</strong><small>{item.symbol || 'Account'}</small></span><span className="activity-date">{new Date(item.created_at).toLocaleDateString()}</span><strong className="positive">{money(item.amount)}</strong></div>)}</div></section>
    if (activeNav === 'Profile & settings') return <section className="settings-grid"><div className="settings-nav panel"><p className="eyebrow">Settings</p>{nav.slice(5).map(([label]) => <button key={label} className="settings-tab active">{label}</button>)}</div><div className="settings-content panel"><div className="panel-header"><div><h2>Profile & settings</h2><p className="panel-subtitle">{profile?.email || session.user.email}</p></div></div><div className="settings-form"><label>Display name<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>Email address<input value={profile?.email || session.user.email} disabled /></label></div><button className="save-settings" onClick={saveProfile}>Save changes</button></div></section>
    return <><section className="summary-grid"><div className="summary-card balance-card"><div className="card-label">Total balance</div><div className="balance-value">{money(portfolioValue + Number(account?.cash_balance || 0))}</div><div className="card-note">Welcome back, {profile?.display_name || 'Tradingbird'}</div></div><div className="summary-card"><div className="card-label">Buying power</div><div className="metric-value">{money(account?.cash_balance)}</div><div className="card-note">Available to invest</div></div><div className="summary-card"><div className="card-label">Watchlist & orders</div><div className="metric-value">{watchlist.length} / {orders.length}</div><div className="card-note">Stocks followed · orders placed</div></div></section><div className="dashboard-grid"><section className="market-panel panel"><div className="panel-header"><div><h2>Market overview</h2><p className="panel-subtitle">Simulated prices · Live</p></div></div><div className="stock-table">{stocks.filter((stock) => watchlist.includes(stock.symbol)).map((stock) => <button className="table-row stock-row" key={stock.symbol} onClick={() => setSelected(stock.symbol)}><span className="asset-cell"><span className="stock-logo" style={{ background: stock.color }}>{stock.symbol[0]}</span><span><strong>{stock.symbol}</strong><small>{stock.name}</small></span></span><strong>{money(stock.price)}</strong><span className={stock.change >= 0 ? 'positive' : 'negative'}>{stock.change.toFixed(2)}%</span><Sparkline /></button>)}</div></section><section className="order-panel panel"><div className="order-heading"><div><span className="selected-label">Selected asset</span><h2>{current.symbol}</h2><p>{current.name}</p></div><button className="star-button" onClick={() => toggleWatch(current.symbol)}>{watchlist.includes(current.symbol) ? '★' : '☆'}</button></div><div className="quote"><strong>{money(current.price)}</strong><span className={current.change >= 0 ? 'positive' : 'negative'}>{current.change.toFixed(2)}%</span></div><div className="trade-toggle"><button className={orderSide === 'Buy' ? 'active buy' : ''} onClick={() => setOrderSide('Buy')}>Buy</button><button className={orderSide === 'Sell' ? 'active sell' : ''} onClick={() => setOrderSide('Sell')}>Sell</button></div><label>Shares<div className="input-wrap"><input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /><span>sh</span></div></label><div className="order-total"><span>Estimated total</span><strong>{money(Number(quantity || 0) * current.price)}</strong></div><button className="place-order" onClick={placeOrder}>{orderSide}<span>→</span></button><p className="execution-note">Prices are simulated</p></section></div></>
  }
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">✦</span> startrade</div><nav>{nav.map(([label, icon]) => <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => setActiveNav(label)}><Icon name={icon} size={17} /><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><button className="fund-button" onClick={() => setActiveNav('Portfolio')}><span>+</span> Add funds</button><button className="nav-item" onClick={() => supabase.auth.signOut()}><Icon name="user" size={17} /><span>Sign out</span></button></div></aside><main className="main-content"><header className="topbar"><div><p className="eyebrow">Personal account</p><h1>{activeNav === 'Overview' ? 'Good morning, Tradingbird' : activeNav}</h1><p className="page-subtitle">Manage your portfolio with confidence.</p></div><div className="topbar-actions"><span className="user-email">{session.user.email}</span></div></header><div className="content-wrap">{renderContent()}<footer><span>© 2026 startrade financial</span></footer></div></main>{toast && <div className="toast"><span className="toast-check">✓</span>{toast}</div>}</div>
}
export default App
