"use strict";

(function () {
  function supported() {
    return Boolean(
      window.isSecureContext &&
      window.PublicKeyCredential &&
      navigator.credentials &&
      typeof navigator.credentials.create === "function" &&
      typeof navigator.credentials.get === "function"
    );
  }

  function fromBase64Url(value) {
    const text = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = text + "=".repeat((4 - (text.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function toBase64Url(value) {
    if (!value) return "";
    const bytes = value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer || value);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function credentialList(list) {
    return Array.isArray(list)
      ? list.map(item => ({
          ...item,
          id: fromBase64Url(item.id)
        }))
      : [];
  }

  function creationOptions(data) {
    const source = data?.publicKey || {};
    return {
      ...source,
      challenge: fromBase64Url(source.challenge),
      user: {
        ...(source.user || {}),
        id: fromBase64Url(source.user?.id)
      },
      excludeCredentials: credentialList(source.excludeCredentials)
    };
  }

  function requestOptions(data) {
    const source = data?.publicKey || {};
    return {
      ...source,
      challenge: fromBase64Url(source.challenge),
      allowCredentials: credentialList(source.allowCredentials)
    };
  }

  async function createCredential(data) {
    if (!supported()) {
      throw new Error("هذا الجهاز أو المتصفح لا يدعم تسجيل الدخول بالبصمة.");
    }

    const credential = await navigator.credentials.create({
      publicKey: creationOptions(data)
    });

    if (!credential || !credential.response) {
      throw new Error("لم يتم إنشاء بصمة دخول.");
    }

    const response = credential.response;

    return {
      id: credential.id,
      rawId: toBase64Url(credential.rawId),
      type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment || null,
      clientExtensionResults:
        typeof credential.getClientExtensionResults === "function"
          ? credential.getClientExtensionResults()
          : {},
      response: {
        clientDataJSON: toBase64Url(response.clientDataJSON),
        attestationObject: toBase64Url(response.attestationObject),
        transports:
          typeof response.getTransports === "function"
            ? response.getTransports()
            : []
      }
    };
  }

  async function getCredential(data) {
    if (!supported()) {
      throw new Error("هذا الجهاز أو المتصفح لا يدعم تسجيل الدخول بالبصمة.");
    }

    const credential = await navigator.credentials.get({
      publicKey: requestOptions(data)
    });

    if (!credential || !credential.response) {
      throw new Error("لم يتم اختيار بصمة دخول.");
    }

    return {
      id: credential.id,
      rawId: toBase64Url(credential.rawId),
      type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment || null,
      clientExtensionResults:
        typeof credential.getClientExtensionResults === "function"
          ? credential.getClientExtensionResults()
          : {},
      response: {
        clientDataJSON: toBase64Url(credential.response.clientDataJSON),
        authenticatorData: toBase64Url(credential.response.authenticatorData),
        signature: toBase64Url(credential.response.signature),
        userHandle: credential.response.userHandle
          ? toBase64Url(credential.response.userHandle)
          : ""
      }
    };
  }

  window.LFPasskeys = {
    supported,
    createCredential,
    getCredential,
    fromBase64Url,
    toBase64Url
  };
})();
