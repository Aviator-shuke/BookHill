(() => {
  const $ = (id) => document.getElementById(id);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const buttons = [...document.querySelectorAll('[data-mode]')];
  const rounds = [];
  let session = null;
  let replayUrl = '';

  const support = {
    secure: window.isSecureContext,
    recognition: Boolean(Recognition),
    microphone: Boolean(navigator.mediaDevices?.getUserMedia),
    recording: Boolean(window.MediaRecorder)
  };

  function report() {
    $('report').value = JSON.stringify({
      version: '20261020-1', userAgent: navigator.userAgent, language: 'en-GB', support, rounds
    }, null, 2);
  }

  function log(s, event, detail = '') {
    s.record.events.push({ milliseconds: Math.round(performance.now() - s.started), event, detail });
    report();
  }

  function renderButtons() {
    buttons.forEach((button) => {
      button.disabled = Boolean(session && session.button !== button) || !support.recognition
        || (button.dataset.mode === 'both' && (!support.microphone || !support.recording));
      button.classList.toggle('is-listening', Boolean(session && session.button === button && !session.stopRequested));
    });
  }

  function stopTracks(s) {
    s.stream?.getTracks().forEach((track) => track.stop());
  }

  function finish(s) {
    if (session !== s || !s.engineEnded || s.waitingForMic || (s.recorder && !s.recordingDone)) return;
    clearTimeout(s.timeout);
    stopTracks(s);
    s.record.completed = true;
    s.record.characters = s.words.length;
    if (s.blob) {
      replayUrl = URL.createObjectURL(s.blob);
      $('replay').src = replayUrl;
    }
    session = null;
    $('status').textContent = s.words ? '本次已识别出文字。' : '本次未返回文字，请保留诊断记录。';
    const latest = (mode) => rounds.findLast((round) => round.mode === mode && round.completed);
    const only = latest('recognition');
    const both = latest('both');
    if (only && both) {
      $('summary').textContent = only.characters && !both.characters
        ? '只识别可用，同时录音时没有文字：结果支持“同时收音冲突”的排查方向，建议各重复一次。'
        : !only.characters && !both.characters
          ? '两项都没有文字：尚不能归因于同时录音，需要检查浏览器识别服务、系统支持、网络或记录中的错误。'
          : both.characters && only.characters
            ? '两项都能识别：本次未复现，需要继续对照主页的事件顺序。'
            : '两项结果不一致，请各再试一次并保留记录。';
    }
    renderButtons();
    report();
  }

  function stop(s) {
    if (session !== s || s.stopRequested) return;
    s.stopRequested = true;
    log(s, 'release-stop');
    $('status').textContent = '正在等待识别结果……';
    try { s.engine.stop(); } catch (error) { log(s, 'stop-error', error.name); }
    if (s.recorder?.state === 'recording') s.recorder.stop();
    stopTracks(s);
    renderButtons();
    s.timeout = setTimeout(() => {
      if (session !== s) return;
      log(s, 'end-timeout');
      s.engineEnded = true;
      try { s.engine.abort(); } catch {}
      finish(s);
    }, 9000);
    finish(s);
  }

  function release() {
    const s = session;
    if (!s || s.releaseTimer || s.stopRequested) return;
    s.releaseTimer = setTimeout(() => stop(s), 300);
  }

  async function begin(button) {
    if (session || button.disabled) return;
    if (replayUrl) {
      $('replay').pause();
      $('replay').removeAttribute('src');
      $('replay').load();
      URL.revokeObjectURL(replayUrl);
      replayUrl = '';
    }
    const s = {
      button, started: performance.now(), engine: new Recognition(), engineEnded: false,
      waitingForMic: button.dataset.mode === 'both', stopRequested: false, words: '', chunks: [],
      record: { mode: button.dataset.mode, completed: false, characters: 0, events: [] }
    };
    session = s;
    rounds.push(s.record);
    $('words').textContent = '请说话……';
    $('status').textContent = '正在启动，请保持按住……';
    renderButtons();
    s.engine.lang = 'en-GB';
    s.engine.interimResults = true;
    s.engine.continuous = false;
    ['start', 'audiostart', 'soundstart', 'speechstart', 'speechend', 'soundend', 'audioend', 'nomatch'].forEach((name) => {
      s.engine.addEventListener(name, () => {
        if (session !== s) return;
        log(s, name);
        if (name === 'start' && !s.stopRequested) $('status').textContent = '正在识别，请继续按住说话。';
      });
    });
    s.engine.addEventListener('result', (event) => {
      if (session !== s) return;
      const text = Array.from(event.results).map((item) => item[0]?.transcript || '').join(' ').trim();
      if (text) { s.words = text; $('words').textContent = text; }
      log(s, 'result', `characters=${text.length}`);
    });
    s.engine.addEventListener('error', (event) => {
      if (session !== s) return;
      log(s, 'recognition-error', event.error || 'unknown');
      $('status').textContent = `识别返回错误：${event.error || 'unknown'}，详情已记入下方记录。`;
    });
    s.engine.addEventListener('end', () => {
      if (session !== s) return;
      log(s, 'end');
      s.engineEnded = true;
      finish(s);
    });
    try { log(s, 'recognition-start'); s.engine.start(); }
    catch (error) { log(s, 'start-error', error.name); s.engineEnded = true; }
    if (button.dataset.mode === 'both') {
      s.waitingForMic = true;
      try {
        log(s, 'getUserMedia-start');
        s.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        log(s, 'getUserMedia-ready');
        if (session !== s || s.stopRequested) { stopTracks(s); return; }
        s.stream.getAudioTracks().forEach((track) => {
          ['mute', 'unmute', 'ended'].forEach((name) => track.addEventListener(name, () => log(s, `track-${name}`)));
        });
        s.recorder = new MediaRecorder(s.stream);
        s.recorder.addEventListener('dataavailable', (event) => { if (event.data.size) s.chunks.push(event.data); });
        s.recorder.addEventListener('stop', () => {
          s.recordingDone = true;
          s.blob = new Blob(s.chunks, { type: s.recorder.mimeType || 'audio/webm' });
          log(s, 'recording-stop', `bytes=${s.blob.size}`);
          stopTracks(s);
          finish(s);
        });
        s.recorder.start();
        log(s, 'recording-start');
      } catch (error) { s.recordingDone = true; stopTracks(s); log(s, 'recording-error', error.name); }
      finally { s.waitingForMic = false; finish(s); }
    } else finish(s);
  }

  buttons.forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || session || button.disabled) return;
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      begin(button);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((name) => button.addEventListener(name, release));
    button.addEventListener('keydown', (event) => {
      if (event.code !== 'Space' || event.repeat) return;
      event.preventDefault();
      begin(button);
    });
    button.addEventListener('keyup', (event) => { if (event.code === 'Space') { event.preventDefault(); release(); } });
    button.addEventListener('click', (event) => event.preventDefault());
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    button.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false });
  });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('report').value); $('status').textContent = '已复制诊断记录。'; }
    catch { $('report').focus(); $('report').select(); $('status').textContent = '请长按已选中的记录，手动复制。'; }
  });
  window.addEventListener('pagehide', () => {
    if (session) {
      clearTimeout(session.releaseTimer);
      clearTimeout(session.timeout);
      try { session.engine.abort(); } catch {}
      if (session.recorder?.state === 'recording') session.recorder.stop();
      stopTracks(session);
      session = null;
    }
    if (replayUrl) URL.revokeObjectURL(replayUrl);
  });
  $('status').textContent = support.recognition ? '先按住第一项测试，再测试第二项。' : '当前浏览器没有提供网页语音识别接口。';
  renderButtons();
  report();
})();
