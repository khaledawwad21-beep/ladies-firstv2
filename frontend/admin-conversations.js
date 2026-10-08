"use strict";

let staffChatContacts = [];
let staffChatOrders = [];
let staffChatProducts = [];
let staffChatThreads = [];
let activeStaffChatId = null;
let activeStaffChat = null;
let staffChatRefreshTimer = null;

function staffChatCan(permission) {
  const role = String(currentAdminUser?.role || "").toLowerCase();
  return role === "owner" || role === "admin" ||
    (Array.isArray(currentAdminUser?.permissions) && currentAdminUser.permissions.includes(permission));
}

async function loadStaffConversations() {
  try {
    const [contacts, threads] = await Promise.all([
      api("/api/staff-conversations/contacts"),
      api("/api/staff-conversations")
    ]);
    staffChatContacts = contacts.contacts || [];
    staffChatThreads = threads.conversations || [];
    const lookups = [];
    if (staffChatCan("orders")) lookups.push(api("/api/admin/orders").then((data) => { staffChatOrders = data.orders || []; }).catch(() => { staffChatOrders = []; }));
    if (staffChatCan("products")) lookups.push(api("/api/admin/products").then((data) => { staffChatProducts = data.products || []; }).catch(() => { staffChatProducts = []; }));
    await Promise.all(lookups);
    if (activeStaffChatId && !staffChatThreads.some((thread) => Number(thread.id) === Number(activeStaffChatId))) {
      activeStaffChatId = null;
      activeStaffChat = null;
    }
    renderStaffConversations();
    if (!staffChatRefreshTimer) staffChatRefreshTimer = setInterval(refreshStaffConversations, 12000);
  } catch (error) {
    $('#sections').innerHTML = `<div class="card"><h2>المحادثات الداخلية</h2><p>${E(error.message || "تعذر تحميل المحادثات")}</p></div>`;
  }
}

async function refreshStaffConversations() {
  if (sec !== "messages" || document.hidden) return;
  try {
    const data = await api("/api/staff-conversations");
    staffChatThreads = data.conversations || [];
    if (activeStaffChatId) {
      const detail = await api(`/api/staff-conversations/${Number(activeStaffChatId)}`);
      activeStaffChat = detail.conversation ? { ...detail.conversation, messages: detail.messages || [] } : null;
    }
    renderStaffConversations();
  } catch (error) {
    console.warn("[STAFF CHAT REFRESH]", error);
  }
}

function staffContextOptions() {
  const type = $("#staffChatContextType")?.value || "";
  const select = $("#staffChatContextId");
  if (!select) return;
  if (!type) {
    select.innerHTML = '<option value="">بدون ربط بطلب أو منتج</option>';
    select.disabled = true;
    return;
  }
  const values = type === "order" ? staffChatOrders : staffChatProducts;
  select.disabled = false;
  if (!values.length) {
    select.innerHTML = '<option value="">لا توجد سجلات متاحة لصلاحية هذا الحساب</option>';
    return;
  }
  select.innerHTML = `<option value="">اختاري ${type === "order" ? "طلبًا" : "منتجًا"}</option>` + values.map((item) => {
    const id = Number(item.id) || 0;
    const label = type === "order"
      ? `#${id} — ${item.customer_name || item.user_email || "طلب"} — ${item.status || ""}`
      : `${item.name || "منتج"} — ${item.sku || "#" + id}`;
    return `<option value="${id}">${E(label)}</option>`;
  }).join("");
}

function renderStaffConversations() {
  const box = $("#sections");
  if (!box) return;
  const current = activeStaffChat;
  box.innerHTML = `<div class="staff-chat-layout">
    <section class="card staff-chat-sidebar">
      <h2>محادثة جديدة</h2>
      <label>الموظف أو المسؤول<select id="staffChatRecipient" class="field"><option value="">اختيار الموظف</option>${staffChatContacts.map((person) => `<option value="${Number(person.id)}">${E(person.name || person.email || "حساب إداري")} — ${E(person.role || "staff")}</option>`).join("")}</select></label>
      <label>ربط المحادثة<select id="staffChatContextType" class="field" onchange="staffContextOptions()"><option value="">محادثة مباشرة</option>${staffChatCan("orders") ? '<option value="order">ملاحظة على طلب</option>' : ""}${staffChatCan("products") ? '<option value="product">ملاحظة على منتج</option>' : ""}</select></label>
      <select id="staffChatContextId" class="field" disabled><option value="">بدون ربط بطلب أو منتج</option></select>
      <textarea id="staffChatFirstMessage" class="field" rows="3" maxlength="3000" placeholder="اكتب ملاحظة أو رسالة للموظف"></textarea>
      <button class="btn primary" type="button" onclick="createStaffConversation()">بدء المحادثة</button>
      <h2 class="staff-chat-list-title">محادثاتي</h2>
      <div class="staff-chat-list">${staffChatThreads.length ? staffChatThreads.map((thread) => `<button class="staff-chat-thread ${Number(thread.id) === Number(activeStaffChatId) ? "active" : ""}" type="button" onclick="openStaffConversation(${Number(thread.id)})"><span><b>${E(thread.other_name || "موظف")}</b><small>${E(thread.context_label || "محادثة مباشرة")}</small><small>${E(thread.last_message || "لا توجد رسائل")}</small></span>${Number(thread.unread_count || 0) ? `<i>${Number(thread.unread_count)}</i>` : ""}</button>`).join("") : '<p class="small-note">لا توجد محادثات بعد.</p>'}</div>
    </section>
    <section class="card staff-chat-main">
      ${current ? `<header class="staff-chat-heading"><div><h2>${E(current.other_name || "محادثة")}</h2><p>${E(current.context_label || "محادثة مباشرة")}</p></div><button class="btn" type="button" onclick="refreshStaffConversations()">تحديث</button></header>
      <div id="staffChatMessages" class="staff-chat-messages">${(current.messages || []).map((message) => `<article class="staff-chat-message ${Number(message.sender_id) === Number(currentAdminUser?.id) ? "mine" : ""}"><b>${E(message.sender_name || "موظف")}</b><p>${E(message.body || "")}</p><time>${E(new Date(message.created_at).toLocaleString("ar-PS"))}</time></article>`).join("") || '<p class="small-note">ابدأ المحادثة برسالة.</p>'}</div>
      <div class="staff-chat-compose"><textarea id="staffChatReply" class="field" rows="2" maxlength="3000" placeholder="اكتب ردًا… واستخدم Ctrl+Enter للإرسال" onkeydown="if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();sendStaffConversationMessage()}"></textarea><button class="btn primary" type="button" onclick="sendStaffConversationMessage()">إرسال</button></div>` : '<div class="staff-chat-empty"><b>المحادثة الداخلية</b><p>اختاري محادثة من القائمة، أو ابدئي محادثة جديدة. ويمكن ربطها بطلب أو منتج لتبقى الملاحظة مع سياقها.</p></div>'}
    </section>
  </div>`;
  staffContextOptions();
  const messages = $("#staffChatMessages");
  if (messages) messages.scrollTop = messages.scrollHeight;
}

async function createStaffConversation() {
  const recipientId = Number($("#staffChatRecipient")?.value || 0);
  const contextType = $("#staffChatContextType")?.value || "";
  const contextId = Number($("#staffChatContextId")?.value || 0) || null;
  const message = $("#staffChatFirstMessage")?.value || "";
  try {
    const data = await api("/api/staff-conversations", {
      method: "POST",
      body: JSON.stringify({ recipientId, contextType, contextId, message })
    });
    activeStaffChatId = Number(data.conversationId);
    await loadStaffConversations();
    await openStaffConversation(activeStaffChatId);
  } catch (error) {
    alert(error.message || "تعذر بدء المحادثة");
  }
}

async function openStaffConversation(id) {
  try {
    const data = await api(`/api/staff-conversations/${Number(id)}`);
    activeStaffChatId = Number(id);
    activeStaffChat = { ...data.conversation, messages: data.messages || [] };
    const list = await api("/api/staff-conversations");
    staffChatThreads = list.conversations || [];
    renderStaffConversations();
  } catch (error) {
    toast(error.message || "تعذر فتح المحادثة");
  }
}

async function sendStaffConversationMessage() {
  const message = $("#staffChatReply")?.value || "";
  if (!activeStaffChatId || !message.trim()) return;
  try {
    await api(`/api/staff-conversations/${Number(activeStaffChatId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ message })
    });
    await openStaffConversation(activeStaffChatId);
  } catch (error) {
    alert(error.message || "تعذر إرسال الرسالة");
  }
}

async function openStaffChatFor(contextType, contextId) {
  await openAdminSection("messages");
  const type = $("#staffChatContextType");
  if (!type) return;
  type.value = contextType;
  staffContextOptions();
  const linked = $("#staffChatContextId");
  if (linked) linked.value = String(contextId);
  $("#staffChatRecipient")?.focus();
}
