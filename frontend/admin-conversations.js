"use strict";

let staffChatContacts = [];
let staffChatOrders = [];
let staffChatProducts = [];
let staffChatThreads = [];
let activeStaffChatId = null;
let activeStaffChat = null;
let staffChatRefreshTimer = null;
let staffChatDrafts = new Map();
let staffChatFirstMessageDraft = "";
let staffChatReplyDraftOwner = null;
let staffChatNewConversationDraft = { recipientId: "", contextType: "", contextId: "", searchQuery: "" };

function staffChatCan(permission) {
  const role = String(currentAdminUser?.role || "").toLowerCase();
  return role === "owner" || role === "admin" ||
    (Array.isArray(currentAdminUser?.permissions) && currentAdminUser.permissions.includes(permission));
}

function staffChatComposerIsFocused() {
  return ["staffChatRecipient", "staffChatContextType", "staffChatContextSearch", "staffChatContextId", "staffChatFirstMessage", "staffChatReply"].includes(document.activeElement?.id);
}

function staffChatHasNewConversationDraft() {
  staffChatCaptureNewConversationDraft();
  return Boolean(
    staffChatNewConversationDraft.recipientId ||
    staffChatNewConversationDraft.contextType ||
    staffChatNewConversationDraft.contextId ||
    staffChatNewConversationDraft.searchQuery ||
    staffChatFirstMessageDraft
  );
}

function staffChatCaptureNewConversationDraft() {
  const recipient = $("#staffChatRecipient");
  const contextType = $("#staffChatContextType");
  const contextId = $("#staffChatContextId");
  const contextSearch = $("#staffChatContextSearch");
  const firstMessage = $("#staffChatFirstMessage");
  if (recipient) staffChatNewConversationDraft.recipientId = recipient.value;
  let typeChanged = false;
  if (contextType) {
    const nextType = contextType.value || "";
    typeChanged = nextType !== staffChatNewConversationDraft.contextType;
    if (typeChanged) staffChatNewConversationDraft.contextId = "";
    staffChatNewConversationDraft.contextType = nextType;
  }
  if (!typeChanged && contextId?.value) staffChatNewConversationDraft.contextId = contextId.value;
  if (!staffChatNewConversationDraft.contextType) {
    staffChatNewConversationDraft.contextId = "";
    staffChatNewConversationDraft.searchQuery = "";
  }
  if (contextSearch) staffChatNewConversationDraft.searchQuery = contextSearch.value;
  if (firstMessage) staffChatFirstMessageDraft = firstMessage.value;
}

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target?.id === "staffChatFirstMessage") staffChatFirstMessageDraft = target.value;
  if (target?.id === "staffChatReply" && staffChatReplyDraftOwner !== null) {
    staffChatDrafts.set(staffChatReplyDraftOwner, target.value);
  }
});

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
    if (staffChatComposerIsFocused() || staffChatHasNewConversationDraft()) return;
    renderStaffConversations();
  } catch (error) {
    console.warn("[STAFF CHAT REFRESH]", error);
  }
}

function normalizeStaffChatSearch(value) {
  return String(value || "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).trim().toLowerCase();
}

function staffContextOptions() {
  const type = $("#staffChatContextType")?.value || "";
  const searchWrap = $("#staffChatContextSearchWrap");
  const search = $("#staffChatContextSearch");
  const select = $("#staffChatContextId");
  if (!select) return;
  const typeChanged = type !== staffChatNewConversationDraft.contextType;
  if (typeChanged) {
    staffChatNewConversationDraft.contextId = "";
    staffChatNewConversationDraft.searchQuery = "";
  } else if (select.value) {
    staffChatNewConversationDraft.contextId = select.value;
  }
  staffChatNewConversationDraft.contextType = type;
  if (!type) {
    staffChatNewConversationDraft.contextId = "";
    staffChatNewConversationDraft.searchQuery = "";
    if (searchWrap) searchWrap.style.display = "none";
    select.innerHTML = '<option value="">بدون ربط بطلب أو منتج</option>';
    select.disabled = true;
    return;
  }
  if (searchWrap) searchWrap.style.display = "block";
  if (search) {
    search.placeholder = type === "order" ? "ابحث برقم الطلب أو هاتف العميل" : "ابحث باسم المنتج أو رقم المنتج";
    search.value = staffChatNewConversationDraft.searchQuery || "";
  }
  select.disabled = false;
  searchStaffContext();
}

function searchStaffContext() {
  const type = $("#staffChatContextType")?.value || "";
  const search = $("#staffChatContextSearch");
  const select = $("#staffChatContextId");
  if (!type || !search || !select) return;
  const query = normalizeStaffChatSearch(search.value);
  staffChatNewConversationDraft.searchQuery = search.value;
  const values = type === "order" ? staffChatOrders : staffChatProducts;
  let matches = [];
  if (query) {
    if (type === "order") {
      const digits = query.replace(/\D/g, "");
      matches = values.filter((order) => {
        const id = normalizeStaffChatSearch(order.id);
        const phone = normalizeStaffChatSearch(order.customer_phone || order.user_phone || order.phone).replace(/\D/g, "");
        return id.includes(query.replace(/^#/, "")) || (digits.length > 0 && phone.includes(digits));
      });
    } else {
      matches = values.filter((product) => {
        const name = normalizeStaffChatSearch(product.name);
        const number = normalizeStaffChatSearch(product.productNumber || product.product_number);
        return name.includes(query) || number.includes(query);
      });
    }
  }
  matches = matches.slice(0, 50);
  const placeholder = query
    ? (matches.length ? "اختاري نتيجة البحث" : "لا توجد نتائج مطابقة")
    : (type === "order" ? "اكتبي رقم الطلب أو هاتف العميل للبحث" : "اكتبي اسم المنتج أو رقمه للبحث");
  select.innerHTML = `<option value="">${E(placeholder)}</option>` + matches.map((item) => {
    const id = Number(item.id) || 0;
    const label = type === "order"
      ? `#${id} — ${item.customer_name || item.user_email || "طلب"} — ${item.customer_phone || item.user_phone || item.phone || "بدون هاتف"} — ${item.status || ""}`
      : `${item.name || "منتج"} — رقم المنتج ${item.productNumber || item.product_number || "غير متوفر"}`;
    return `<option value="${id}">${E(label)}</option>`;
  }).join("");
  select.value = staffChatNewConversationDraft.contextId;
  if (select.value !== staffChatNewConversationDraft.contextId) staffChatNewConversationDraft.contextId = "";
}

function renderStaffConversations() {
  const box = $("#sections");
  if (!box) return;
  staffChatCaptureNewConversationDraft();
  const existingReply = $("#staffChatReply");
  if (existingReply && staffChatReplyDraftOwner !== null) staffChatDrafts.set(staffChatReplyDraftOwner, existingReply.value);
  const existingFirstMessage = $("#staffChatFirstMessage");
  if (existingFirstMessage) staffChatFirstMessageDraft = existingFirstMessage.value;
  const current = activeStaffChat;
  box.innerHTML = `<div class="staff-chat-layout">
    <section class="card staff-chat-sidebar">
      <h2>محادثة جديدة</h2>
      <label>الموظف أو المسؤول<select id="staffChatRecipient" class="field" onchange="staffChatCaptureNewConversationDraft()"><option value="">اختيار الموظف</option>${staffChatContacts.map((person) => `<option value="${Number(person.id)}">${E(person.name || person.email || "حساب إداري")} — ${E(person.role || "staff")}</option>`).join("")}</select></label>
      <label>ربط المحادثة<select id="staffChatContextType" class="field" onchange="staffContextOptions()"><option value="">محادثة مباشرة</option>${staffChatCan("orders") ? '<option value="order">ملاحظة على طلب</option>' : ""}${staffChatCan("products") ? '<option value="product">ملاحظة على منتج</option>' : ""}</select></label>
      <label id="staffChatContextSearchWrap" style="display:none">بحث مباشر<input id="staffChatContextSearch" class="field" type="search" autocomplete="off" oninput="searchStaffContext()"></label>
      <select id="staffChatContextId" class="field" size="5" disabled onchange="staffChatCaptureNewConversationDraft()"><option value="">بدون ربط بطلب أو منتج</option></select>
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
  const recipientField = $("#staffChatRecipient");
  if (recipientField) recipientField.value = staffChatNewConversationDraft.recipientId;
  const contextTypeField = $("#staffChatContextType");
  if (contextTypeField) contextTypeField.value = staffChatNewConversationDraft.contextType;
  const contextSearchField = $("#staffChatContextSearch");
  if (contextSearchField) contextSearchField.value = staffChatNewConversationDraft.searchQuery || "";
  staffContextOptions();
  const contextIdField = $("#staffChatContextId");
  if (contextIdField) contextIdField.value = staffChatNewConversationDraft.contextId;
  const firstMessageField = $("#staffChatFirstMessage");
  if (firstMessageField) firstMessageField.value = staffChatFirstMessageDraft;
  const replyField = $("#staffChatReply");
  staffChatReplyDraftOwner = replyField && activeStaffChatId ? Number(activeStaffChatId) : null;
  if (replyField && staffChatReplyDraftOwner !== null) replyField.value = staffChatDrafts.get(staffChatReplyDraftOwner) || "";
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
    staffChatFirstMessageDraft = "";
    staffChatNewConversationDraft = { recipientId: "", contextType: "", contextId: "", searchQuery: "" };
    const firstMessageField = $("#staffChatFirstMessage");
    if (firstMessageField) firstMessageField.value = "";
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
    const conversationId = Number(activeStaffChatId);
    await api(`/api/staff-conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message })
    });
    staffChatDrafts.delete(conversationId);
    staffChatReplyDraftOwner = null;
    await openStaffConversation(conversationId);
  } catch (error) {
    alert(error.message || "تعذر إرسال الرسالة");
  }
}

async function openStaffChatFor(contextType, contextId) {
  await openAdminSection("messages");
  const type = $("#staffChatContextType");
  if (!type) return;
  const records = contextType === "order" ? staffChatOrders : staffChatProducts;
  const record = records.find((item) => Number(item.id) === Number(contextId));
  staffChatNewConversationDraft.recipientId = $("#staffChatRecipient")?.value || staffChatNewConversationDraft.recipientId;
  staffChatNewConversationDraft.contextType = contextType;
  staffChatNewConversationDraft.contextId = String(contextId);
  staffChatNewConversationDraft.searchQuery = contextType === "order"
    ? String(contextId)
    : String(record?.productNumber || record?.product_number || record?.name || "");
  type.value = contextType;
  staffContextOptions();
  const search = $("#staffChatContextSearch");
  if (search) search.value = staffChatNewConversationDraft.searchQuery;
  searchStaffContext();
  const linked = $("#staffChatContextId");
  if (linked) linked.value = String(contextId);
  $("#staffChatRecipient")?.focus();
}
