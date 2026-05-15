(() => {
  'use strict';

  const STORAGE_KEY = 'hotelPmsHtmlData_v1';
  const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'checked-in'];
  const BLOCKING_ROOM_STATUSES = ['out-of-service', 'inactive'];

  const bookingStatuses = [
    { value: 'pending', label: 'Προσωρινή' },
    { value: 'confirmed', label: 'Επιβεβαιωμένη' },
    { value: 'checked-in', label: 'Check-in' },
    { value: 'checked-out', label: 'Check-out' },
    { value: 'cancelled', label: 'Ακυρωμένη' },
    { value: 'no-show', label: 'No-show' }
  ];

  const roomStatuses = [
    { value: 'active', label: 'Ενεργό' },
    { value: 'inactive', label: 'Ανενεργό' },
    { value: 'out-of-service', label: 'Εκτός λειτουργίας' }
  ];

  const housekeepingStatuses = [
    { value: 'clean', label: 'Καθαρό' },
    { value: 'dirty', label: 'Βρώμικο' },
    { value: 'cleaning', label: 'Σε καθαρισμό' },
    { value: 'maintenance', label: 'Συντήρηση' },
    { value: 'inspect', label: 'Για έλεγχο' }
  ];

  const bookingSources = ['Direct', 'Booking.com', 'Airbnb', 'Expedia', 'Τηλέφωνο', 'Walk-in', 'Πρακτορείο'];
  const paymentMethods = ['Μετρητά', 'Κάρτα', 'Τραπεζική κατάθεση', 'POS', 'Online', 'Άλλο'];

  let state = loadState();
  let activeView = 'dashboard';

  const $ = (id) => document.getElementById(id);
  const fmt = new Intl.NumberFormat('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindNavigation();
    bindForms();
    bindButtons();
    setInitialInputs();
    refreshAll();
    registerServiceWorker();
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return normalizeState(parsed);
      }
    } catch (error) {
      console.warn('Could not parse saved data:', error);
    }
    return seedState();
  }

  function normalizeState(data) {
    const seeded = seedState(false);
    return {
      hotel: { ...seeded.hotel, ...(data.hotel || {}) },
      rooms: Array.isArray(data.rooms) ? data.rooms : seeded.rooms,
      bookings: Array.isArray(data.bookings) ? data.bookings : seeded.bookings,
      payments: Array.isArray(data.payments) ? data.payments : seeded.payments,
      meta: { ...seeded.meta, ...(data.meta || {}), updatedAt: new Date().toISOString() }
    };
  }

  function saveState() {
    state.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateStorageInfo();
  }

  function seedState(withSamples = true) {
    const today = todayIso();
    const rooms = [
      ...rangeRooms(101, 110, 'Standard Double', 1, 2, 2, 70),
      ...rangeRooms(201, 212, 'Superior Double', 2, 2, 3, 85),
      ...rangeRooms(301, 306, 'Family Room', 3, 3, 4, 110),
      ...rangeRooms(401, 404, 'Suite', 4, 3, 4, 150)
    ];

    rooms[4].housekeeping = 'dirty';
    rooms[8].housekeeping = 'dirty';
    rooms[19].housekeeping = 'maintenance';
    rooms[30].status = 'out-of-service';
    rooms[30].housekeeping = 'maintenance';
    rooms[30].notes = 'Προσωρινά εκτός λειτουργίας για συντήρηση.';

    const bookings = withSamples ? [
      makeBooking('BK-0001', '101', 'Γιάννης Παπαδόπουλος', addDays(today, -1), addDays(today, 2), 2, 70, 50, 'confirmed', 'Τηλέφωνο'),
      makeBooking('BK-0002', '102', 'Maria Smith', today, addDays(today, 3), 2, 75, 100, 'confirmed', 'Booking.com'),
      makeBooking('BK-0003', '205', 'Νίκος Αντωνίου', addDays(today, -2), today, 2, 85, 85, 'checked-in', 'Direct'),
      makeBooking('BK-0004', '303', 'Elena Rossi', addDays(today, 1), addDays(today, 5), 4, 120, 120, 'pending', 'Airbnb'),
      makeBooking('BK-0005', '401', 'Οικογένεια Δημητρίου', addDays(today, 4), addDays(today, 8), 3, 150, 200, 'confirmed', 'Direct'),
      makeBooking('BK-0006', '206', 'Peter Jones', addDays(today, 6), addDays(today, 9), 2, 90, 0, 'confirmed', 'Expedia')
    ] : [];

    const payments = withSamples ? [
      { id: 'PAY-0001', bookingId: 'BK-0001', date: today, type: 'payment', method: 'Κάρτα', amount: 90, notes: 'Μερική εξόφληση' },
      { id: 'PAY-0002', bookingId: 'BK-0002', date: today, type: 'payment', method: 'Online', amount: 125, notes: '' },
      { id: 'PAY-0003', bookingId: 'BK-0005', date: today, type: 'payment', method: 'Τραπεζική κατάθεση', amount: 200, notes: 'Προκαταβολή επιβεβαίωσης' }
    ] : [];

    return {
      hotel: {
        name: 'Hotel Reservation Manager',
        phone: '',
        email: '',
        currency: '€',
        checkIn: '15:00',
        checkOut: '11:00'
      },
      rooms,
      bookings,
      payments,
      meta: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  function rangeRooms(start, end, type, floor, beds, capacity, rate) {
    const rooms = [];
    for (let number = start; number <= end; number += 1) {
      rooms.push({
        id: String(number),
        type,
        floor: String(floor),
        beds,
        capacity,
        baseRate: rate,
        status: 'active',
        housekeeping: 'clean',
        lastCleaned: addDays(todayIso(), -((number % 5) + 1)),
        notes: ''
      });
    }
    return rooms;
  }

  function makeBooking(id, roomId, guestName, arrival, departure, guests, rate, deposit, status, source) {
    return {
      id,
      roomId,
      guestName,
      phone: '',
      email: '',
      arrival,
      departure,
      guests,
      source,
      status,
      pricePerNight: rate,
      deposit,
      notes: ''
    };
  }

  function bindNavigation() {
    document.querySelectorAll('.nav-link').forEach((button) => {
      button.addEventListener('click', () => showView(button.dataset.view));
    });
    $('menuBtn').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  }

  function showView(view) {
    activeView = view;
    document.querySelectorAll('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
    document.querySelectorAll('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`));
    const section = $(`view-${view}`);
    $('pageTitle').textContent = section?.dataset.title || 'Hotel PMS';
    $('pageSubtitle').textContent = section?.dataset.subtitle || '';
    $('sidebar').classList.remove('open');
    refreshAll();
  }

  function bindForms() {
    $('quickAvailabilityForm').addEventListener('submit', (event) => {
      event.preventDefault();
      renderQuickAvailability();
    });

    $('availabilityForm').addEventListener('submit', (event) => {
      event.preventDefault();
      renderAvailabilityResults();
    });

    $('bookingForm').addEventListener('submit', (event) => {
      event.preventDefault();
      saveBookingFromForm();
    });

    ['bookingArrival', 'bookingDeparture', 'bookingRoom', 'bookingRate', 'bookingDeposit'].forEach((id) => {
      $(id).addEventListener('input', renderBookingComputed);
      $(id).addEventListener('change', renderBookingComputed);
    });

    $('bookingRoom').addEventListener('change', () => {
      const room = getRoom($('bookingRoom').value);
      if (room && !$('bookingRate').value) $('bookingRate').value = room.baseRate || 0;
      renderBookingComputed();
    });

    $('roomForm').addEventListener('submit', (event) => {
      event.preventDefault();
      saveRoomFromForm();
    });

    $('paymentForm').addEventListener('submit', (event) => {
      event.preventDefault();
      savePaymentFromForm();
    });

    $('hotelSettingsForm').addEventListener('submit', (event) => {
      event.preventDefault();
      state.hotel.name = $('hotelName').value.trim() || 'Hotel PMS';
      state.hotel.phone = $('hotelPhone').value.trim();
      state.hotel.email = $('hotelEmail').value.trim();
      state.hotel.currency = $('hotelCurrency').value.trim() || '€';
      state.hotel.checkIn = $('hotelCheckIn').value;
      state.hotel.checkOut = $('hotelCheckOut').value;
      saveState();
      showAlert('Οι ρυθμίσεις αποθηκεύτηκαν.');
      refreshAll();
    });

    const filterIds = [
      'bookingSearch', 'bookingStatusFilter', 'bookingFromFilter', 'bookingToFilter',
      'roomSearch', 'roomTypeFilter', 'roomStatusFilter',
      'housekeepingFilter', 'housekeepingSearch',
      'paymentSearch', 'paymentFromFilter', 'paymentToFilter'
    ];
    filterIds.forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('input', refreshCurrentView);
      if (el) el.addEventListener('change', refreshCurrentView);
    });

    $('businessDate').addEventListener('change', refreshAll);
    $('calendarStart').addEventListener('change', renderCalendar);
    $('calendarDays').addEventListener('input', renderCalendar);
    $('reportYear').addEventListener('input', renderReports);
  }

  function bindButtons() {
    $('newBookingTopBtn').addEventListener('click', () => openBookingDialog());
    $('newBookingBtn').addEventListener('click', () => openBookingDialog());
    $('newRoomBtn').addEventListener('click', () => openRoomDialog());
    $('newPaymentBtn').addEventListener('click', () => openPaymentDialog());

    $('cancelBookingBtn').addEventListener('click', () => $('bookingDialog').close());
    $('cancelRoomBtn').addEventListener('click', () => $('roomDialog').close());
    $('cancelPaymentBtn').addEventListener('click', () => $('paymentDialog').close());

    $('deleteBookingBtn').addEventListener('click', deleteCurrentBooking);
    $('deleteRoomBtn').addEventListener('click', deleteCurrentRoom);
    $('deletePaymentBtn').addEventListener('click', deleteCurrentPayment);

    $('clearBookingFiltersBtn').addEventListener('click', () => {
      ['bookingSearch', 'bookingStatusFilter', 'bookingFromFilter', 'bookingToFilter'].forEach((id) => $(id).value = '');
      renderBookings();
    });

    $('runConflictsBtn').addEventListener('click', renderConflicts);
    $('prevCalendarBtn').addEventListener('click', () => shiftCalendar(-14));
    $('nextCalendarBtn').addEventListener('click', () => shiftCalendar(14));
    $('markDeparturesDirtyBtn').addEventListener('click', markDeparturesDirty);
    $('refreshReportsBtn').addEventListener('click', renderReports);
    $('printBookingsBtn').addEventListener('click', () => { showView('bookings'); window.print(); });
    $('printReportsBtn').addEventListener('click', () => { showView('reports'); window.print(); });
    $('exportCsvBtn').addEventListener('click', exportReportsCsv);
    $('exportDataBtn').addEventListener('click', exportJsonBackup);
    $('exportQuickBtn').addEventListener('click', exportJsonBackup);
    $('importDataInput').addEventListener('change', importJsonBackup);
    $('resetDemoBtn').addEventListener('click', resetDemoData);
    $('clearAllBtn').addEventListener('click', clearAllData);
  }

  function setInitialInputs() {
    const today = todayIso();
    $('businessDate').value = today;
    $('quickArrival').value = today;
    $('quickDeparture').value = addDays(today, 1);
    $('availabilityArrival').value = today;
    $('availabilityDeparture').value = addDays(today, 1);
    $('calendarStart').value = startOfMonthIso(today);
    $('reportYear').value = new Date().getFullYear();
  }

  function refreshAll() {
    populateStaticOptions();
    renderHotelSettings();
    updateStorageInfo();
    renderDashboard();
    renderCalendar();
    renderAvailabilityResults(false);
    renderBookings();
    renderRooms();
    renderHousekeeping();
    renderPayments();
    renderReports();
  }

  function refreshCurrentView() {
    switch (activeView) {
      case 'dashboard': renderDashboard(); break;
      case 'calendar': renderCalendar(); break;
      case 'availability': renderAvailabilityResults(false); break;
      case 'bookings': renderBookings(); break;
      case 'rooms': renderRooms(); break;
      case 'housekeeping': renderHousekeeping(); break;
      case 'payments': renderPayments(); break;
      case 'reports': renderReports(); break;
      case 'settings': renderHotelSettings(); break;
      default: refreshAll();
    }
  }

  function populateStaticOptions() {
    $('hotelNameSide').textContent = state.hotel.name || 'Hotel PMS';
    setOptions($('bookingStatus'), bookingStatuses);
    setOptions($('bookingStatusFilter'), [{ value: '', label: 'Όλες' }, ...bookingStatuses]);
    setOptions($('roomStatus'), roomStatuses);
    setOptions($('roomStatusFilter'), [{ value: '', label: 'Όλες' }, ...roomStatuses]);
    setOptions($('roomHousekeeping'), housekeepingStatuses);
    setOptions($('housekeepingFilter'), [{ value: '', label: 'Όλα' }, ...housekeepingStatuses]);
    setOptions($('bookingSource'), bookingSources.map((source) => ({ value: source, label: source })));
    setOptions($('paymentMethod'), paymentMethods.map((method) => ({ value: method, label: method })));

    const types = uniqueRoomTypes();
    ['quickRoomType', 'availabilityType', 'roomTypeFilter'].forEach((id) => {
      setOptions($(id), [{ value: '', label: id === 'roomTypeFilter' ? 'Όλοι' : 'Όλοι' }, ...types.map((type) => ({ value: type, label: type }))]);
    });
    $('roomTypesList').innerHTML = types.map((type) => `<option value="${escapeHtml(type)}"></option>`).join('');

    setOptions($('bookingRoom'), state.rooms
      .slice()
      .sort(roomSort)
      .map((room) => ({ value: room.id, label: `${room.id} · ${room.type} · ${formatMoney(room.baseRate)}/νύχτα${room.status !== 'active' ? ' · εκτός' : ''}` })));

    setOptions($('paymentBooking'), state.bookings
      .slice()
      .sort((a, b) => b.arrival.localeCompare(a.arrival))
      .map((booking) => ({ value: booking.id, label: `${booking.id} · ${booking.guestName} · δωμ. ${booking.roomId} · υπόλοιπο ${formatMoney(bookingBalance(booking))}` })));
  }

  function setOptions(select, options) {
    if (!select) return;
    const current = select.value;
    select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
    if (options.some((option) => option.value === current)) select.value = current;
  }

  function renderHotelSettings() {
    $('hotelName').value = state.hotel.name || '';
    $('hotelPhone').value = state.hotel.phone || '';
    $('hotelEmail').value = state.hotel.email || '';
    $('hotelCurrency').value = state.hotel.currency || '€';
    $('hotelCheckIn').value = state.hotel.checkIn || '15:00';
    $('hotelCheckOut').value = state.hotel.checkOut || '11:00';
  }

  function renderDashboard() {
    const date = $('businessDate').value || todayIso();
    const activeRooms = state.rooms.filter((room) => room.status === 'active');
    const blockedRooms = state.rooms.filter((room) => BLOCKING_ROOM_STATUSES.includes(room.status)).length;
    const occupiedBookings = state.bookings.filter((booking) => isBookingActive(booking) && dateInStay(date, booking));
    const occupiedRoomIds = new Set(occupiedBookings.map((booking) => booking.roomId));
    const occupied = occupiedRoomIds.size;
    const available = Math.max(0, activeRooms.length - occupied);
    const arrivals = bookingsArrivingOn(date);
    const departures = bookingsDepartingOn(date);
    const occupancy = activeRooms.length ? (occupied / activeRooms.length) * 100 : 0;
    const month = date.slice(0, 7);
    const monthRevenue = activeBookings().filter((booking) => booking.arrival.slice(0, 7) === month).reduce((sum, booking) => sum + bookingTotal(booking), 0);
    const monthPayments = state.payments.filter((payment) => payment.date.slice(0, 7) === month).reduce((sum, payment) => sum + signedPayment(payment), 0);
    const outstanding = activeBookings().reduce((sum, booking) => sum + bookingBalance(booking), 0);

    const stats = [
      { label: 'Ενεργά δωμάτια', value: activeRooms.length, detail: `${blockedRooms} εκτός/ανενεργά` },
      { label: 'Ελεύθερα σήμερα', value: available, detail: `${formatPercent(100 - occupancy)} διαθεσιμότητα` },
      { label: 'Κατειλημμένα', value: occupied, detail: `${formatPercent(occupancy)} πληρότητα` },
      { label: 'Αφίξεις', value: arrivals.length, detail: formatDate(date) },
      { label: 'Αναχωρήσεις', value: departures.length, detail: formatDate(date) },
      { label: 'Έσοδα μήνα', value: formatMoney(monthRevenue), detail: `Εισπράξεις: ${formatMoney(monthPayments)}` },
      { label: 'Υπόλοιπα', value: formatMoney(outstanding), detail: 'Από ενεργές κρατήσεις' },
      { label: 'Βρώμικα/έλεγχος', value: state.rooms.filter((room) => ['dirty', 'inspect'].includes(room.housekeeping)).length, detail: 'Housekeeping' },
      { label: 'ADR μήνα', value: formatMoney(calculateAdrForMonth(month)), detail: 'Average Daily Rate' }
    ];

    $('statsGrid').innerHTML = stats.map((stat) => `
      <article class="stat-card">
        <span>${escapeHtml(stat.label)}</span>
        <strong>${escapeHtml(String(stat.value))}</strong>
        <em>${escapeHtml(stat.detail)}</em>
      </article>
    `).join('');

    renderMiniTable($('arrivalsTable'), arrivals, ['ID', 'Δωμ.', 'Πελάτης', 'Άτομα', 'Υπόλοιπο'], (booking) => [
      booking.id,
      booking.roomId,
      booking.guestName,
      String(booking.guests),
      formatMoney(bookingBalance(booking))
    ], true);

    renderMiniTable($('departuresTable'), departures, ['ID', 'Δωμ.', 'Πελάτης', 'Καθαριότητα', 'Υπόλοιπο'], (booking) => {
      const room = getRoom(booking.roomId);
      return [booking.id, booking.roomId, booking.guestName, housekeepingLabel(room?.housekeeping), formatMoney(bookingBalance(booking))];
    }, true);

    renderConflicts(false);
    renderQuickAvailability();
  }

  function renderMiniTable(table, rows, headers, mapper, clickable = false) {
    if (!rows.length) {
      table.innerHTML = `<tbody><tr><td>${document.querySelector('#emptyTemplate').innerHTML}</td></tr></tbody>`;
      return;
    }
    table.innerHTML = `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => {
      const attrs = clickable ? ` data-booking="${escapeHtml(row.id)}" class="clickable-row"` : '';
      return `<tr${attrs}>${mapper(row).map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`;
    }).join('')}</tbody>`;
    if (clickable) {
      table.querySelectorAll('[data-booking]').forEach((tr) => tr.addEventListener('click', () => openBookingDialog(tr.dataset.booking)));
    }
  }

  function renderConflicts(showMessage = true) {
    const conflicts = findConflicts();
    const box = $('conflictsBox');
    if (!conflicts.length) {
      box.className = 'empty-state';
      box.innerHTML = 'Δεν εντοπίστηκαν διπλοκρατήσεις.';
      if (showMessage) showAlert('Δεν εντοπίστηκαν διπλοκρατήσεις.');
      return;
    }
    box.className = 'alert';
    box.innerHTML = conflicts.map((conflict) => `
      <div><strong>Δωμάτιο ${escapeHtml(conflict.roomId)}</strong>: ${escapeHtml(conflict.a.id)} (${escapeHtml(conflict.a.guestName)}) συγκρούεται με ${escapeHtml(conflict.b.id)} (${escapeHtml(conflict.b.guestName)})</div>
    `).join('');
    if (showMessage) showAlert(`Προσοχή: βρέθηκαν ${conflicts.length} πιθανές συγκρούσεις.`, 'warning');
  }

  function renderQuickAvailability() {
    const arrival = $('quickArrival').value;
    const departure = $('quickDeparture').value;
    const type = $('quickRoomType').value;
    const result = $('quickAvailabilityResult');
    if (!arrival || !departure || !isValidStay(arrival, departure)) {
      result.innerHTML = '<span class="badge warn">Βάλε σωστό διάστημα.</span>';
      return;
    }
    const rooms = availableRooms(arrival, departure, { type });
    if (!rooms.length) {
      result.innerHTML = '<span class="badge danger">Δεν υπάρχει διαθέσιμο δωμάτιο.</span>';
      return;
    }
    result.innerHTML = rooms.slice(0, 14).map((room) => `<button class="chip" data-room="${escapeHtml(room.id)}">${escapeHtml(room.id)} · ${escapeHtml(room.type)}</button>`).join('') + (rooms.length > 14 ? `<span class="chip">+${rooms.length - 14} ακόμη</span>` : '');
    result.querySelectorAll('[data-room]').forEach((chip) => chip.addEventListener('click', () => openBookingDialog(null, { roomId: chip.dataset.room, arrival, departure })));
  }

  function renderCalendar() {
    if (activeView !== 'calendar' && !document.querySelector('#view-calendar.active')) return;
    const start = $('calendarStart').value || todayIso();
    const days = clamp(parseInt($('calendarDays').value, 10) || 31, 7, 62);
    const activeRooms = state.rooms.slice().sort(roomSort);
    const dates = Array.from({ length: days }, (_, index) => addDays(start, index));
    const columns = `150px repeat(${days}, 88px)`;

    let html = `<div class="calendar-grid" style="grid-template-columns:${columns}">`;
    html += '<div class="calendar-day calendar-corner">Δωμάτιο</div>';
    dates.forEach((date) => {
      html += `<div class="calendar-day"><div>${shortWeekday(date)}</div><div>${formatDateShort(date)}</div></div>`;
    });

    activeRooms.forEach((room) => {
      html += `<div class="calendar-room"><span>${escapeHtml(room.id)}</span><small>${escapeHtml(room.type)}</small></div>`;
      dates.forEach((date) => {
        const booking = bookingForRoomDate(room.id, date);
        const maintenance = room.status !== 'active' || ['maintenance'].includes(room.housekeeping);
        const classes = ['calendar-cell', booking ? 'occupied' : 'free'];
        if (maintenance) classes.push('maintenance');
        const bookingHtml = booking ? `<div class="booking-pill ${escapeHtml(booking.status)}" title="${escapeHtml(booking.id + ' · ' + booking.guestName)}">${escapeHtml(booking.guestName)}</div>` : '';
        html += `<div class="${classes.join(' ')}" data-room="${escapeHtml(room.id)}" data-date="${escapeHtml(date)}" ${booking ? `data-booking="${escapeHtml(booking.id)}"` : ''}>${bookingHtml}</div>`;
      });
    });
    html += '</div>';
    $('calendarWrap').innerHTML = html;

    $('calendarWrap').querySelectorAll('.calendar-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        if (cell.dataset.booking) openBookingDialog(cell.dataset.booking);
        else openBookingDialog(null, { roomId: cell.dataset.room, arrival: cell.dataset.date, departure: addDays(cell.dataset.date, 1) });
      });
    });
  }

  function renderAvailabilityResults(requireSubmit = true) {
    if (activeView !== 'availability' && requireSubmit) return;
    const arrival = $('availabilityArrival').value;
    const departure = $('availabilityDeparture').value;
    const type = $('availabilityType').value;
    const guests = parseInt($('availabilityGuests').value, 10) || 1;
    const box = $('availabilityResults');

    if (!arrival || !departure) {
      box.innerHTML = '<div class="empty-state">Συμπλήρωσε ημερομηνίες για να εμφανιστούν διαθέσιμα δωμάτια.</div>';
      return;
    }
    if (!isValidStay(arrival, departure)) {
      box.innerHTML = '<div class="empty-state">Η αναχώρηση πρέπει να είναι μετά την άφιξη.</div>';
      return;
    }

    const rooms = availableRooms(arrival, departure, { type, guests });
    if (!rooms.length) {
      box.innerHTML = '<div class="empty-state">Δεν βρέθηκαν διαθέσιμα δωμάτια με αυτά τα κριτήρια.</div>';
      return;
    }
    const nights = nightsBetween(arrival, departure);
    box.innerHTML = rooms.map((room) => `
      <article class="room-card">
        <strong>Δωμάτιο ${escapeHtml(room.id)}</strong>
        <div class="room-meta"><span>${escapeHtml(room.type)}</span><span>·</span><span>${escapeHtml(String(room.capacity))} άτομα</span><span>·</span><span>${formatMoney(room.baseRate)}/νύχτα</span></div>
        <div class="badge ok">Διαθέσιμο για ${nights} νύχτ.${nights === 1 ? 'α' : 'ες'}</div>
        <button class="primary" data-book-room="${escapeHtml(room.id)}">Κράτηση</button>
      </article>
    `).join('');
    box.querySelectorAll('[data-book-room]').forEach((button) => {
      button.addEventListener('click', () => openBookingDialog(null, { roomId: button.dataset.bookRoom, arrival, departure, guests }));
    });
  }

  function renderBookings() {
    const search = $('bookingSearch').value.trim().toLowerCase();
    const status = $('bookingStatusFilter').value;
    const from = $('bookingFromFilter').value;
    const to = $('bookingToFilter').value;
    const rows = state.bookings
      .filter((booking) => !status || booking.status === status)
      .filter((booking) => !from || booking.departure > from)
      .filter((booking) => !to || booking.arrival <= to)
      .filter((booking) => {
        if (!search) return true;
        return [booking.id, booking.roomId, booking.guestName, booking.phone, booking.email, booking.source].some((value) => String(value || '').toLowerCase().includes(search));
      })
      .sort((a, b) => a.arrival.localeCompare(b.arrival) || roomSortValue(a.roomId).localeCompare(roomSortValue(b.roomId)));

    const table = $('bookingsTable');
    if (!rows.length) {
      table.innerHTML = `<tbody><tr><td>${document.querySelector('#emptyTemplate').innerHTML}</td></tr></tbody>`;
      return;
    }

    table.innerHTML = `
      <thead><tr>
        <th>ID</th><th>Δωμάτιο</th><th>Πελάτης</th><th>Άφιξη</th><th>Αναχώρηση</th><th>Νύχτες</th><th>Κατάσταση</th><th>Σύνολο</th><th>Πληρωμένα</th><th>Υπόλοιπο</th><th></th>
      </tr></thead>
      <tbody>${rows.map((booking) => `
        <tr>
          <td>${escapeHtml(booking.id)}</td>
          <td>${escapeHtml(booking.roomId)}</td>
          <td><strong>${escapeHtml(booking.guestName)}</strong><br><small>${escapeHtml(booking.phone || booking.source || '')}</small></td>
          <td>${formatDate(booking.arrival)}</td>
          <td>${formatDate(booking.departure)}</td>
          <td>${nightsBetween(booking.arrival, booking.departure)}</td>
          <td>${statusBadge(booking.status)}</td>
          <td>${formatMoney(bookingTotal(booking))}</td>
          <td>${formatMoney(bookingPaid(booking))}</td>
          <td class="${bookingBalance(booking) > 0 ? 'amount-due' : 'amount-positive'}">${formatMoney(bookingBalance(booking))}</td>
          <td><div class="row-actions"><button class="ghost small" data-edit-booking="${escapeHtml(booking.id)}">Άνοιγμα</button><button class="ghost small" data-pay-booking="${escapeHtml(booking.id)}">Πληρωμή</button></div></td>
        </tr>`).join('')}
      </tbody>`;

    table.querySelectorAll('[data-edit-booking]').forEach((button) => button.addEventListener('click', () => openBookingDialog(button.dataset.editBooking)));
    table.querySelectorAll('[data-pay-booking]').forEach((button) => button.addEventListener('click', () => openPaymentDialog(null, { bookingId: button.dataset.payBooking })));
  }

  function renderRooms() {
    const search = $('roomSearch').value.trim().toLowerCase();
    const type = $('roomTypeFilter').value;
    const status = $('roomStatusFilter').value;
    const date = $('businessDate').value || todayIso();
    const rows = state.rooms
      .filter((room) => !type || room.type === type)
      .filter((room) => !status || room.status === status)
      .filter((room) => !search || [room.id, room.type, room.floor, room.notes].some((value) => String(value || '').toLowerCase().includes(search)))
      .sort(roomSort);

    const table = $('roomsTable');
    if (!rows.length) {
      table.innerHTML = `<tbody><tr><td>${document.querySelector('#emptyTemplate').innerHTML}</td></tr></tbody>`;
      return;
    }

    table.innerHTML = `
      <thead><tr><th>Δωμάτιο</th><th>Τύπος</th><th>Όροφος</th><th>Άτομα</th><th>Τιμή</th><th>Λειτουργία</th><th>Καθαριότητα</th><th>Σήμερα</th><th></th></tr></thead>
      <tbody>${rows.map((room) => {
        const booking = bookingForRoomDate(room.id, date);
        return `<tr>
          <td><strong>${escapeHtml(room.id)}</strong></td>
          <td>${escapeHtml(room.type)}</td>
          <td>${escapeHtml(room.floor || '-')}</td>
          <td>${escapeHtml(String(room.capacity || ''))}</td>
          <td>${formatMoney(room.baseRate || 0)}</td>
          <td>${roomStatusBadge(room.status)}</td>
          <td>${housekeepingBadge(room.housekeeping)}</td>
          <td>${booking ? `<span class="badge info">${escapeHtml(booking.guestName)}</span>` : '<span class="badge ok">Ελεύθερο</span>'}</td>
          <td><div class="row-actions"><button class="ghost small" data-edit-room="${escapeHtml(room.id)}">Επεξεργασία</button></div></td>
        </tr>`;
      }).join('')}</tbody>`;
    table.querySelectorAll('[data-edit-room]').forEach((button) => button.addEventListener('click', () => openRoomDialog(button.dataset.editRoom)));
  }

  function renderHousekeeping() {
    const filter = $('housekeepingFilter').value;
    const search = $('housekeepingSearch').value.trim().toLowerCase();
    const date = $('businessDate').value || todayIso();
    const rows = state.rooms
      .filter((room) => !filter || room.housekeeping === filter)
      .filter((room) => !search || [room.id, room.type, room.notes].some((value) => String(value || '').toLowerCase().includes(search)))
      .sort(roomSort);

    const table = $('housekeepingTable');
    if (!rows.length) {
      table.innerHTML = `<tbody><tr><td>${document.querySelector('#emptyTemplate').innerHTML}</td></tr></tbody>`;
      return;
    }

    table.innerHTML = `
      <thead><tr><th>Δωμάτιο</th><th>Τύπος</th><th>Κατάσταση</th><th>Σήμερα</th><th>Τελευταίος καθαρισμός</th><th>Σημείωση</th><th></th></tr></thead>
      <tbody>${rows.map((room) => {
        const current = bookingForRoomDate(room.id, date);
        const departure = bookingsDepartingOn(date).find((booking) => booking.roomId === room.id);
        const arrival = bookingsArrivingOn(date).find((booking) => booking.roomId === room.id);
        const todayText = departure ? `Αναχώρηση: ${departure.guestName}` : arrival ? `Άφιξη: ${arrival.guestName}` : current ? `Διαμονή: ${current.guestName}` : 'Χωρίς κίνηση';
        return `<tr>
          <td><strong>${escapeHtml(room.id)}</strong></td>
          <td>${escapeHtml(room.type)}</td>
          <td>${housekeepingBadge(room.housekeeping)}</td>
          <td>${escapeHtml(todayText)}</td>
          <td>${room.lastCleaned ? formatDate(room.lastCleaned) : '-'}</td>
          <td>${escapeHtml(room.notes || '')}</td>
          <td><div class="row-actions">
            ${housekeepingStatuses.map((status) => `<button class="ghost small" data-hk-room="${escapeHtml(room.id)}" data-hk-status="${escapeHtml(status.value)}">${escapeHtml(status.label)}</button>`).join('')}
          </div></td>
        </tr>`;
      }).join('')}</tbody>`;

    table.querySelectorAll('[data-hk-room]').forEach((button) => button.addEventListener('click', () => {
      const room = getRoom(button.dataset.hkRoom);
      if (!room) return;
      room.housekeeping = button.dataset.hkStatus;
      if (room.housekeeping === 'clean') room.lastCleaned = todayIso();
      saveState();
      renderHousekeeping();
      renderDashboard();
    }));
  }

  function renderPayments() {
    const search = $('paymentSearch').value.trim().toLowerCase();
    const from = $('paymentFromFilter').value;
    const to = $('paymentToFilter').value;
    const rows = state.payments
      .filter((payment) => !from || payment.date >= from)
      .filter((payment) => !to || payment.date <= to)
      .filter((payment) => {
        const booking = getBooking(payment.bookingId);
        if (!search) return true;
        return [payment.id, payment.bookingId, payment.method, payment.notes, booking?.guestName].some((value) => String(value || '').toLowerCase().includes(search));
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const table = $('paymentsTable');
    if (!rows.length) {
      table.innerHTML = `<tbody><tr><td>${document.querySelector('#emptyTemplate').innerHTML}</td></tr></tbody>`;
      return;
    }

    table.innerHTML = `
      <thead><tr><th>ID</th><th>Ημερομηνία</th><th>Κράτηση</th><th>Πελάτης</th><th>Τύπος</th><th>Μέθοδος</th><th>Ποσό</th><th>Σημείωση</th><th></th></tr></thead>
      <tbody>${rows.map((payment) => {
        const booking = getBooking(payment.bookingId);
        const signed = signedPayment(payment);
        return `<tr>
          <td>${escapeHtml(payment.id)}</td>
          <td>${formatDate(payment.date)}</td>
          <td>${escapeHtml(payment.bookingId)}</td>
          <td>${escapeHtml(booking?.guestName || '-')}</td>
          <td>${payment.type === 'refund' ? '<span class="badge danger">Επιστροφή</span>' : '<span class="badge ok">Είσπραξη</span>'}</td>
          <td>${escapeHtml(payment.method || '')}</td>
          <td class="${signed >= 0 ? 'amount-positive' : 'amount-negative'}">${formatMoney(signed)}</td>
          <td>${escapeHtml(payment.notes || '')}</td>
          <td><button class="ghost small" data-edit-payment="${escapeHtml(payment.id)}">Άνοιγμα</button></td>
        </tr>`;
      }).join('')}</tbody>`;
    table.querySelectorAll('[data-edit-payment]').forEach((button) => button.addEventListener('click', () => openPaymentDialog(button.dataset.editPayment)));
  }

  function renderReports() {
    const year = parseInt($('reportYear').value, 10) || new Date().getFullYear();
    const activeRooms = state.rooms.filter((room) => room.status === 'active').length || 1;
    const rows = Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, '0')}`;
      const days = daysInMonth(year, index + 1);
      const capacityNights = activeRooms * days;
      const bookings = activeBookings().filter((booking) => stayTouchesMonth(booking, month));
      const roomNights = bookings.reduce((sum, booking) => sum + nightsInMonth(booking, month), 0);
      const revenue = bookings.reduce((sum, booking) => sum + (nightsInMonth(booking, month) * Number(booking.pricePerNight || 0)), 0);
      const payments = state.payments.filter((payment) => payment.date.slice(0, 7) === month).reduce((sum, payment) => sum + signedPayment(payment), 0);
      const occupancy = capacityNights ? (roomNights / capacityNights) * 100 : 0;
      const adr = roomNights ? revenue / roomNights : 0;
      const revpar = capacityNights ? revenue / capacityNights : 0;
      const balances = bookings.reduce((sum, booking) => sum + bookingBalance(booking), 0);
      return { month, roomNights, capacityNights, occupancy, revenue, payments, adr, revpar, balances };
    });

    const totals = rows.reduce((acc, row) => {
      acc.roomNights += row.roomNights;
      acc.capacityNights += row.capacityNights;
      acc.revenue += row.revenue;
      acc.payments += row.payments;
      acc.balances += row.balances;
      return acc;
    }, { roomNights: 0, capacityNights: 0, revenue: 0, payments: 0, balances: 0 });

    $('reportsTable').innerHTML = `
      <thead><tr><th>Μήνας</th><th>Room nights</th><th>Δυναμικότητα</th><th>Πληρότητα</th><th>Έσοδα</th><th>Εισπράξεις</th><th>ADR</th><th>RevPAR</th><th>Υπόλοιπα</th></tr></thead>
      <tbody>${rows.map((row) => `
        <tr><td>${monthLabel(row.month)}</td><td>${row.roomNights}</td><td>${row.capacityNights}</td><td>${formatPercent(row.occupancy)}</td><td>${formatMoney(row.revenue)}</td><td>${formatMoney(row.payments)}</td><td>${formatMoney(row.adr)}</td><td>${formatMoney(row.revpar)}</td><td>${formatMoney(row.balances)}</td></tr>`).join('')}
        <tr><td><strong>Σύνολο</strong></td><td><strong>${totals.roomNights}</strong></td><td><strong>${totals.capacityNights}</strong></td><td><strong>${formatPercent(totals.capacityNights ? totals.roomNights / totals.capacityNights * 100 : 0)}</strong></td><td><strong>${formatMoney(totals.revenue)}</strong></td><td><strong>${formatMoney(totals.payments)}</strong></td><td><strong>${formatMoney(totals.roomNights ? totals.revenue / totals.roomNights : 0)}</strong></td><td><strong>${formatMoney(totals.capacityNights ? totals.revenue / totals.capacityNights : 0)}</strong></td><td><strong>${formatMoney(totals.balances)}</strong></td></tr>
      </tbody>`;
  }

  function openBookingDialog(bookingId = null, defaults = {}) {
    populateStaticOptions();
    const booking = bookingId ? getBooking(bookingId) : null;
    $('bookingDialogTitle').textContent = booking ? `Κράτηση ${booking.id}` : 'Νέα κράτηση';
    $('bookingId').value = booking?.id || '';
    $('guestName').value = booking?.guestName || '';
    $('guestPhone').value = booking?.phone || '';
    $('guestEmail').value = booking?.email || '';
    $('bookingSource').value = booking?.source || defaults.source || 'Direct';
    $('bookingRoom').value = booking?.roomId || defaults.roomId || state.rooms.find((room) => room.status === 'active')?.id || '';
    $('bookingStatus').value = booking?.status || defaults.status || 'confirmed';
    $('bookingArrival').value = booking?.arrival || defaults.arrival || $('businessDate').value || todayIso();
    $('bookingDeparture').value = booking?.departure || defaults.departure || addDays($('bookingArrival').value, 1);
    $('bookingGuests').value = booking?.guests || defaults.guests || 1;
    const room = getRoom($('bookingRoom').value);
    $('bookingRate').value = booking?.pricePerNight ?? room?.baseRate ?? 0;
    $('bookingDeposit').value = booking?.deposit ?? 0;
    $('bookingNotes').value = booking?.notes || '';
    $('deleteBookingBtn').classList.toggle('hidden', !booking);
    renderBookingComputed();
    $('bookingDialog').showModal();
  }

  function saveBookingFromForm() {
    const id = $('bookingId').value || nextBookingId();
    const booking = {
      id,
      guestName: $('guestName').value.trim(),
      phone: $('guestPhone').value.trim(),
      email: $('guestEmail').value.trim(),
      source: $('bookingSource').value,
      roomId: $('bookingRoom').value,
      status: $('bookingStatus').value,
      arrival: $('bookingArrival').value,
      departure: $('bookingDeparture').value,
      guests: Number($('bookingGuests').value || 1),
      pricePerNight: Number($('bookingRate').value || 0),
      deposit: Number($('bookingDeposit').value || 0),
      notes: $('bookingNotes').value.trim()
    };

    if (!booking.guestName) return showAlert('Συμπλήρωσε όνομα πελάτη.', 'warning');
    if (!isValidStay(booking.arrival, booking.departure)) return showAlert('Η αναχώρηση πρέπει να είναι μετά την άφιξη.', 'warning');
    const room = getRoom(booking.roomId);
    if (!room) return showAlert('Δεν βρέθηκε το δωμάτιο.', 'warning');
    if (room.status !== 'active' && isBookingActive(booking)) return showAlert('Το δωμάτιο είναι ανενεργό ή εκτός λειτουργίας.', 'warning');
    const conflicts = findBookingConflicts(booking, id);
    if (conflicts.length && isBookingActive(booking)) {
      showAlert(`Δεν αποθηκεύτηκε: υπάρχει σύγκρουση με ${conflicts.map((item) => item.id).join(', ')}.`, 'warning');
      return;
    }

    const index = state.bookings.findIndex((item) => item.id === id);
    if (index >= 0) state.bookings[index] = booking;
    else state.bookings.push(booking);

    if (booking.status === 'checked-out') {
      const bookedRoom = getRoom(booking.roomId);
      if (bookedRoom) bookedRoom.housekeeping = 'dirty';
    }

    saveState();
    $('bookingDialog').close();
    showAlert('Η κράτηση αποθηκεύτηκε.');
    refreshAll();
  }

  function renderBookingComputed() {
    const arrival = $('bookingArrival').value;
    const departure = $('bookingDeparture').value;
    const rate = Number($('bookingRate').value || 0);
    const deposit = Number($('bookingDeposit').value || 0);
    const id = $('bookingId').value;
    const temp = {
      id: id || 'NEW',
      roomId: $('bookingRoom').value,
      arrival,
      departure,
      status: $('bookingStatus').value || 'confirmed',
      pricePerNight: rate,
      deposit
    };
    if (!isValidStay(arrival, departure)) {
      $('bookingComputed').innerHTML = '<span class="amount-due">Η αναχώρηση πρέπει να είναι μετά την άφιξη.</span>';
      return;
    }
    const nights = nightsBetween(arrival, departure);
    const total = nights * rate;
    const conflicts = findBookingConflicts(temp, id);
    $('bookingComputed').innerHTML = `
      <div>Νύχτες: <span>${nights}</span></div>
      <div>Σύνολο: <span>${formatMoney(total)}</span></div>
      <div>Προκαταβολή: <span>${formatMoney(deposit)}</span></div>
      <div>Αρχικό υπόλοιπο: <span>${formatMoney(Math.max(0, total - deposit))}</span></div>
      ${conflicts.length ? `<div class="amount-due">Προσοχή: σύγκρουση με ${escapeHtml(conflicts.map((item) => item.id).join(', '))}</div>` : '<div class="amount-positive">Δεν υπάρχει σύγκρουση.</div>'}
    `;
  }

  function deleteCurrentBooking() {
    const id = $('bookingId').value;
    if (!id) return;
    if (!confirm('Να διαγραφεί οριστικά αυτή η κράτηση;')) return;
    state.bookings = state.bookings.filter((booking) => booking.id !== id);
    state.payments = state.payments.filter((payment) => payment.bookingId !== id);
    saveState();
    $('bookingDialog').close();
    showAlert('Η κράτηση διαγράφηκε.');
    refreshAll();
  }

  function openRoomDialog(roomId = null) {
    populateStaticOptions();
    const room = roomId ? getRoom(roomId) : null;
    $('roomDialogTitle').textContent = room ? `Δωμάτιο ${room.id}` : 'Νέο δωμάτιο';
    $('roomOriginalId').value = room?.id || '';
    $('roomId').value = room?.id || '';
    $('roomType').value = room?.type || 'Standard Double';
    $('roomFloor').value = room?.floor || '';
    $('roomBeds').value = room?.beds || 2;
    $('roomCapacity').value = room?.capacity || 2;
    $('roomRate').value = room?.baseRate || 60;
    $('roomStatus').value = room?.status || 'active';
    $('roomHousekeeping').value = room?.housekeeping || 'clean';
    $('roomNotes').value = room?.notes || '';
    $('deleteRoomBtn').classList.toggle('hidden', !room);
    $('roomDialog').showModal();
  }

  function saveRoomFromForm() {
    const originalId = $('roomOriginalId').value;
    const id = $('roomId').value.trim();
    if (!id) return showAlert('Συμπλήρωσε αριθμό δωματίου.', 'warning');
    if (state.rooms.some((room) => room.id === id && room.id !== originalId)) return showAlert('Υπάρχει ήδη δωμάτιο με αυτόν τον αριθμό.', 'warning');

    const room = {
      id,
      type: $('roomType').value.trim() || 'Standard',
      floor: $('roomFloor').value.trim(),
      beds: Number($('roomBeds').value || 1),
      capacity: Number($('roomCapacity').value || 1),
      baseRate: Number($('roomRate').value || 0),
      status: $('roomStatus').value,
      housekeeping: $('roomHousekeeping').value,
      lastCleaned: $('roomHousekeeping').value === 'clean' ? todayIso() : (getRoom(originalId)?.lastCleaned || ''),
      notes: $('roomNotes').value.trim()
    };

    const index = state.rooms.findIndex((item) => item.id === originalId);
    if (index >= 0) state.rooms[index] = room;
    else state.rooms.push(room);

    if (originalId && originalId !== id) {
      state.bookings.forEach((booking) => { if (booking.roomId === originalId) booking.roomId = id; });
    }

    saveState();
    $('roomDialog').close();
    showAlert('Το δωμάτιο αποθηκεύτηκε.');
    refreshAll();
  }

  function deleteCurrentRoom() {
    const id = $('roomOriginalId').value;
    if (!id) return;
    if (state.bookings.some((booking) => booking.roomId === id)) return showAlert('Δεν μπορεί να διαγραφεί δωμάτιο που έχει κρατήσεις. Βάλ’ το ανενεργό ή εκτός λειτουργίας.', 'warning');
    if (!confirm('Να διαγραφεί οριστικά αυτό το δωμάτιο;')) return;
    state.rooms = state.rooms.filter((room) => room.id !== id);
    saveState();
    $('roomDialog').close();
    showAlert('Το δωμάτιο διαγράφηκε.');
    refreshAll();
  }

  function openPaymentDialog(paymentId = null, defaults = {}) {
    populateStaticOptions();
    const payment = paymentId ? getPayment(paymentId) : null;
    $('paymentDialogTitle').textContent = payment ? `Πληρωμή ${payment.id}` : 'Νέα πληρωμή';
    $('paymentId').value = payment?.id || '';
    $('paymentBooking').value = payment?.bookingId || defaults.bookingId || state.bookings[0]?.id || '';
    $('paymentDate').value = payment?.date || todayIso();
    $('paymentType').value = payment?.type || 'payment';
    $('paymentMethod').value = payment?.method || 'Κάρτα';
    $('paymentAmount').value = payment?.amount || Math.max(0, bookingBalance(getBooking($('paymentBooking').value) || { deposit: 0, pricePerNight: 0, arrival: todayIso(), departure: todayIso() }));
    $('paymentNotes').value = payment?.notes || '';
    $('deletePaymentBtn').classList.toggle('hidden', !payment);
    $('paymentDialog').showModal();
  }

  function savePaymentFromForm() {
    const id = $('paymentId').value || nextPaymentId();
    const payment = {
      id,
      bookingId: $('paymentBooking').value,
      date: $('paymentDate').value,
      type: $('paymentType').value,
      method: $('paymentMethod').value,
      amount: Number($('paymentAmount').value || 0),
      notes: $('paymentNotes').value.trim()
    };
    if (!payment.bookingId || !getBooking(payment.bookingId)) return showAlert('Επίλεξε έγκυρη κράτηση.', 'warning');
    if (!payment.date) return showAlert('Συμπλήρωσε ημερομηνία πληρωμής.', 'warning');
    if (payment.amount <= 0) return showAlert('Το ποσό πρέπει να είναι μεγαλύτερο από 0.', 'warning');

    const index = state.payments.findIndex((item) => item.id === id);
    if (index >= 0) state.payments[index] = payment;
    else state.payments.push(payment);
    saveState();
    $('paymentDialog').close();
    showAlert('Η πληρωμή αποθηκεύτηκε.');
    refreshAll();
  }

  function deleteCurrentPayment() {
    const id = $('paymentId').value;
    if (!id) return;
    if (!confirm('Να διαγραφεί οριστικά αυτή η πληρωμή;')) return;
    state.payments = state.payments.filter((payment) => payment.id !== id);
    saveState();
    $('paymentDialog').close();
    showAlert('Η πληρωμή διαγράφηκε.');
    refreshAll();
  }

  function markDeparturesDirty() {
    const date = $('businessDate').value || todayIso();
    const departingRoomIds = new Set(bookingsDepartingOn(date).map((booking) => booking.roomId));
    let changed = 0;
    state.rooms.forEach((room) => {
      if (departingRoomIds.has(room.id)) {
        room.housekeeping = 'dirty';
        changed += 1;
      }
    });
    saveState();
    showAlert(`${changed} δωμάτια σημειώθηκαν ως βρώμικα.`);
    refreshAll();
  }

  function shiftCalendar(days) {
    $('calendarStart').value = addDays($('calendarStart').value || todayIso(), days);
    renderCalendar();
  }

  function resetDemoData() {
    if (!confirm('Να γίνει επαναφορά στα demo δεδομένα; Τα τρέχοντα δεδομένα θα χαθούν.')) return;
    state = seedState(true);
    saveState();
    showAlert('Έγινε επαναφορά demo δεδομένων.');
    refreshAll();
  }

  function clearAllData() {
    if (!confirm('Να διαγραφούν όλα τα δεδομένα; Η ενέργεια δεν αναιρείται.')) return;
    state = { ...seedState(false), rooms: [], bookings: [], payments: [] };
    saveState();
    showAlert('Όλα τα δεδομένα διαγράφηκαν.');
    refreshAll();
  }

  function exportJsonBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `hotel-pms-backup-${todayIso()}.json`);
  }

  function importJsonBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.rooms || !Array.isArray(parsed.rooms)) throw new Error('Invalid backup');
        state = normalizeState(parsed);
        saveState();
        showAlert('Το backup εισήχθη με επιτυχία.');
        refreshAll();
      } catch (error) {
        showAlert('Το αρχείο δεν είναι έγκυρο JSON backup της εφαρμογής.', 'warning');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  function exportReportsCsv() {
    const year = parseInt($('reportYear').value, 10) || new Date().getFullYear();
    const rows = [['Μήνας', 'Room nights', 'Δυναμικότητα', 'Πληρότητα %', 'Έσοδα', 'Εισπράξεις', 'ADR', 'RevPAR', 'Υπόλοιπα']];
    const activeRooms = state.rooms.filter((room) => room.status === 'active').length || 1;
    for (let index = 1; index <= 12; index += 1) {
      const month = `${year}-${String(index).padStart(2, '0')}`;
      const days = daysInMonth(year, index);
      const capacityNights = activeRooms * days;
      const bookings = activeBookings().filter((booking) => stayTouchesMonth(booking, month));
      const roomNights = bookings.reduce((sum, booking) => sum + nightsInMonth(booking, month), 0);
      const revenue = bookings.reduce((sum, booking) => sum + (nightsInMonth(booking, month) * Number(booking.pricePerNight || 0)), 0);
      const payments = state.payments.filter((payment) => payment.date.slice(0, 7) === month).reduce((sum, payment) => sum + signedPayment(payment), 0);
      rows.push([monthLabel(month), roomNights, capacityNights, capacityNights ? roomNights / capacityNights * 100 : 0, revenue, payments, roomNights ? revenue / roomNights : 0, capacityNights ? revenue / capacityNights : 0, bookings.reduce((sum, booking) => sum + bookingBalance(booking), 0)]);
    }
    const csv = rows.map((row) => row.map(csvCell).join(';')).join('\n');
    downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `hotel-pms-reports-${year}.csv`);
  }

  function availableRooms(arrival, departure, filters = {}) {
    return state.rooms
      .filter((room) => room.status === 'active')
      .filter((room) => room.housekeeping !== 'maintenance')
      .filter((room) => !filters.type || room.type === filters.type)
      .filter((room) => !filters.guests || Number(room.capacity || 0) >= Number(filters.guests))
      .filter((room) => !state.bookings.some((booking) => isBookingActive(booking) && booking.roomId === room.id && staysOverlap(arrival, departure, booking.arrival, booking.departure)))
      .sort(roomSort);
  }

  function findBookingConflicts(candidate, ignoreId = '') {
    if (!candidate.roomId || !candidate.arrival || !candidate.departure) return [];
    return state.bookings.filter((booking) => {
      if (booking.id === ignoreId) return false;
      if (booking.roomId !== candidate.roomId) return false;
      if (!isBookingActive(booking)) return false;
      return staysOverlap(candidate.arrival, candidate.departure, booking.arrival, booking.departure);
    });
  }

  function findConflicts() {
    const conflicts = [];
    const active = activeBookings();
    for (let i = 0; i < active.length; i += 1) {
      for (let j = i + 1; j < active.length; j += 1) {
        const a = active[i];
        const b = active[j];
        if (a.roomId === b.roomId && staysOverlap(a.arrival, a.departure, b.arrival, b.departure)) {
          conflicts.push({ roomId: a.roomId, a, b });
        }
      }
    }
    return conflicts;
  }

  function bookingForRoomDate(roomId, date) {
    return activeBookings()
      .filter((booking) => booking.roomId === roomId && dateInStay(date, booking))
      .sort((a, b) => statusPriority(a.status) - statusPriority(b.status))[0] || null;
  }

  function activeBookings() {
    return state.bookings.filter(isBookingActive);
  }

  function isBookingActive(booking) {
    return ACTIVE_BOOKING_STATUSES.includes(booking.status);
  }

  function statusPriority(status) {
    return { 'checked-in': 1, confirmed: 2, pending: 3 }[status] || 10;
  }

  function bookingsArrivingOn(date) {
    return state.bookings.filter((booking) => isBookingActive(booking) && booking.arrival === date).sort((a, b) => roomSortValue(a.roomId).localeCompare(roomSortValue(b.roomId)));
  }

  function bookingsDepartingOn(date) {
    return state.bookings.filter((booking) => isBookingActive(booking) && booking.departure === date).sort((a, b) => roomSortValue(a.roomId).localeCompare(roomSortValue(b.roomId)));
  }

  function bookingTotal(booking) {
    if (!booking || !isValidStay(booking.arrival, booking.departure)) return 0;
    return nightsBetween(booking.arrival, booking.departure) * Number(booking.pricePerNight || 0);
  }

  function bookingPaid(booking) {
    if (!booking) return 0;
    const payments = state.payments.filter((payment) => payment.bookingId === booking.id).reduce((sum, payment) => sum + signedPayment(payment), 0);
    return Number(booking.deposit || 0) + payments;
  }

  function bookingBalance(booking) {
    if (!booking) return 0;
    return Math.max(0, bookingTotal(booking) - bookingPaid(booking));
  }

  function signedPayment(payment) {
    const amount = Number(payment.amount || 0);
    return payment.type === 'refund' ? -amount : amount;
  }

  function getBooking(id) { return state.bookings.find((booking) => booking.id === id); }
  function getPayment(id) { return state.payments.find((payment) => payment.id === id); }
  function getRoom(id) { return state.rooms.find((room) => room.id === id); }

  function uniqueRoomTypes() {
    return [...new Set(state.rooms.map((room) => room.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'el'));
  }

  function roomSort(a, b) { return roomSortValue(a.id).localeCompare(roomSortValue(b.id)); }
  function roomSortValue(value) { return String(value).padStart(10, '0'); }

  function isValidStay(arrival, departure) {
    return Boolean(arrival && departure && departure > arrival);
  }

  function staysOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }

  function dateInStay(date, booking) {
    return booking.arrival <= date && date < booking.departure;
  }

  function stayTouchesMonth(booking, month) {
    const start = `${month}-01`;
    const end = addDays(addMonths(start, 1), 0);
    return staysOverlap(booking.arrival, booking.departure, start, end);
  }

  function nightsInMonth(booking, month) {
    const start = `${month}-01`;
    const end = addMonths(start, 1);
    const overlapStart = booking.arrival > start ? booking.arrival : start;
    const overlapEnd = booking.departure < end ? booking.departure : end;
    return Math.max(0, nightsBetween(overlapStart, overlapEnd));
  }

  function calculateAdrForMonth(month) {
    const bookings = activeBookings().filter((booking) => stayTouchesMonth(booking, month));
    const roomNights = bookings.reduce((sum, booking) => sum + nightsInMonth(booking, month), 0);
    const revenue = bookings.reduce((sum, booking) => sum + (nightsInMonth(booking, month) * Number(booking.pricePerNight || 0)), 0);
    return roomNights ? revenue / roomNights : 0;
  }

  function todayIso() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  function addDays(isoDate, days) {
    const date = parseIsoDate(isoDate);
    date.setDate(date.getDate() + days);
    return toIsoDate(date);
  }

  function addMonths(isoDate, months) {
    const date = parseIsoDate(isoDate);
    date.setMonth(date.getMonth() + months);
    return toIsoDate(date);
  }

  function parseIsoDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function toIsoDate(date) {
    const safe = new Date(date);
    safe.setMinutes(safe.getMinutes() - safe.getTimezoneOffset());
    return safe.toISOString().slice(0, 10);
  }

  function nightsBetween(start, end) {
    if (!start || !end || end <= start) return 0;
    return Math.round((parseIsoDate(end) - parseIsoDate(start)) / 86400000);
  }

  function startOfMonthIso(isoDate) {
    return `${isoDate.slice(0, 7)}-01`;
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function nextBookingId() {
    const max = state.bookings.reduce((highest, booking) => Math.max(highest, parseInt(String(booking.id).replace(/\D/g, ''), 10) || 0), 0);
    return `BK-${String(max + 1).padStart(4, '0')}`;
  }

  function nextPaymentId() {
    const max = state.payments.reduce((highest, payment) => Math.max(highest, parseInt(String(payment.id).replace(/\D/g, ''), 10) || 0), 0);
    return `PAY-${String(max + 1).padStart(4, '0')}`;
  }

  function formatMoney(value) {
    return `${fmt.format(Number(value || 0))}${state.hotel.currency || '€'}`;
  }

  function formatPercent(value) {
    return `${fmt.format(Number(value || 0))}%`;
  }

  function formatDate(isoDate) {
    if (!isoDate) return '-';
    return parseIsoDate(isoDate).toLocaleDateString('el-GR');
  }

  function formatDateShort(isoDate) {
    const date = parseIsoDate(isoDate);
    return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
  }

  function shortWeekday(isoDate) {
    return parseIsoDate(isoDate).toLocaleDateString('el-GR', { weekday: 'short' });
  }

  function monthLabel(month) {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Date(year, monthNumber - 1, 1).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  }

  function statusLabel(value) { return bookingStatuses.find((status) => status.value === value)?.label || value; }
  function roomStatusLabel(value) { return roomStatuses.find((status) => status.value === value)?.label || value; }
  function housekeepingLabel(value) { return housekeepingStatuses.find((status) => status.value === value)?.label || value; }

  function statusBadge(value) {
    const cls = { pending: 'warn', confirmed: 'teal', 'checked-in': 'info', 'checked-out': 'muted', cancelled: 'danger', 'no-show': 'danger' }[value] || 'muted';
    return `<span class="badge ${cls}">${escapeHtml(statusLabel(value))}</span>`;
  }

  function roomStatusBadge(value) {
    const cls = value === 'active' ? 'ok' : value === 'out-of-service' ? 'danger' : 'muted';
    return `<span class="badge ${cls}">${escapeHtml(roomStatusLabel(value))}</span>`;
  }

  function housekeepingBadge(value) {
    const cls = { clean: 'ok', dirty: 'danger', cleaning: 'info', maintenance: 'warn', inspect: 'warn' }[value] || 'muted';
    return `<span class="badge ${cls}">${escapeHtml(housekeepingLabel(value))}</span>`;
  }

  function showAlert(message, type = 'ok') {
    const alert = $('globalAlert');
    alert.textContent = message;
    alert.className = type === 'warning' ? 'alert' : 'alert';
    alert.classList.remove('hidden');
    window.clearTimeout(showAlert.timer);
    showAlert.timer = window.setTimeout(() => alert.classList.add('hidden'), 4200);
  }

  function updateStorageInfo() {
    const updated = state.meta?.updatedAt ? new Date(state.meta.updatedAt).toLocaleString('el-GR') : '-';
    $('storageInfo').textContent = `Αποθηκεύτηκε: ${updated}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function csvCell(value) {
    const text = String(value ?? '').replaceAll('"', '""');
    return `"${text}"`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch((error) => console.warn('Service worker registration failed:', error));
    }
  }
})();
