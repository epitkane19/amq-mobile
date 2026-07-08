import React, { useRef, useState, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Pressable } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const webviewRef = useRef<React.ElementRef<typeof WebView>>(null);
  const [showControls, setShowControls] = useState(false);

  // CSS injected into AMQ
  const injectedCSS = `
    const style = document.createElement('style');

    style.innerHTML = \`

      #gameChatContainer {
        display: none !important;
      }

      #qpVideoContainer {
        width: 100% !important;
        height: auto !important;
      }

      #qpAnswerInput {
        font-size: 20px !important;
        height: 50px !important;
      }

      #qpVideoSkipContainer {
        transform: translateY(-60px) !important;
      }

      #gameChatPage > .col-xs-9,
      #battleRoyalPage > .col-xs-9 {
          width: 100% !important;
          max-width: 100% !important;
          flex: 0 0 100% !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
      }

      /* AMQ's own "floatingContainer" script recalculates qpSongInfoContainer's
         width/margins using the old col-xs-3 (15px padding) math and writes them
         as plain (non-!important) inline styles — which silently overwrites our
         JS-applied width:100%. A stylesheet !important rule beats a later plain
         inline style regardless of write order, so this can't be clobbered. */
      #qpSongInfoContainer {
        width: 100% !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        left: auto !important;
        right: auto !important;
      }


    \`;

    document.head.appendChild(style);

  `;

  // JS executed after page load
  const injectedJS = `
    (${injectedCSS})();
    true;
  `;

  type Direction = "up" | "left" | "down" | "right";

  const setDirection = (
    direction: Direction,
    pressed: boolean
  ) => {

    webviewRef.current?.injectJavaScript(`
      try {

        const br = Object.values(window).find(
          v => v?.map?.playerMovementController
        );

        if (br) {
          br.map.playerMovementController.keysDown.${direction} = ${pressed};
        }

      } catch {}

      true;
    `);
  };

  const releaseAll = () => {
    webviewRef.current?.injectJavaScript(`
      const br = Object.values(window).find(
        v => v?.map?.playerMovementController
      );

      if (br) {
        br.map.playerMovementController.reset();
      }

      true;
    `);
  };

  const debugMap = () => {
    webviewRef.current?.injectJavaScript(`
      const map = document.getElementById('brMap');
      const content = document.getElementById('brMapContent');

      if (map && content) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            map: {
              width: map.offsetWidth,
              height: map.offsetHeight
            },
            content: {
              width: content.offsetWidth,
              height: content.offsetHeight
            },
            screen: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          })
        );
      }

      true;
    `);
  };

  const debugBattleRoyalLayout = () => {
    webviewRef.current?.injectJavaScript(`
      const ids = [...document.querySelectorAll('[id]')]
        .map(el => ({
          id: el.id,
          width: el.offsetWidth,
          height: el.offsetHeight
        }))
        .filter(el =>
          el.id.toLowerCase().includes('chat') ||
          el.id.toLowerCase().includes('battle') ||
          el.id.toLowerCase().includes('br') ||
          el.id.toLowerCase().includes('player')
        );

      window.ReactNativeWebView.postMessage(
        JSON.stringify(ids)
      );

      true;
    `);
  };

  const debugBackground = () => {
    webviewRef.current?.injectJavaScript(`
      try {

        const candidates = [
          document.body,
          document.documentElement,
          document.getElementById('gameContainer'),
          document.getElementById('mainContainer'),
          document.getElementById('mpMainContainer'),
          document.getElementById('battleRoyalPage')
        ];

        const result = [];

        candidates.forEach(el => {

          if (!el) return;

          const style = getComputedStyle(el);

          result.push({
            id: el.id || el.tagName,
            backgroundImage: style.backgroundImage,
            backgroundRepeat: style.backgroundRepeat,
            backgroundSize: style.backgroundSize,
            backgroundPosition: style.backgroundPosition
          });

        });

        window.ReactNativeWebView.postMessage(
          JSON.stringify(result)
        );

      } catch (e) {

        window.ReactNativeWebView.postMessage(
          "ERROR: " + e.message
        );

      }

      true;
    `);
  };

  const applyMobileLayout = () => {
    webviewRef.current?.injectJavaScript(`
      (function() {
        try {

          const debug = (label, value) => {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                label,
                value
              }, null, 2)
            );
          };

          const setStyles = (el, styles) => {
            if (!el) return;
            Object.entries(styles).forEach(([prop, value]) => {
              el.style.setProperty(prop, value, 'important');
            });
          };

          const hideSelectors = selectors => {
            selectors.forEach(sel => {
              const el = document.querySelector(sel);
              if (el) el.style.setProperty('display', 'none', 'important');
            });
          };

          // Video skip button
          const applyVideoSkipLayout = () => {
            const skipContainer = document.getElementById('qpVideoSkipContainer');
            if (!skipContainer) return;
 
            setStyles(skipContainer, {
              'top': '70%'
            });
          };

          // ---- Lobby top bar (rules, start, leave, settings, room name) ----
          const applyTopBarLayout = () => {
            const topBar = document.querySelector('#lobbyPage .topMenuBar');
            if (!topBar) return;

            const leaveBtn    = document.getElementById('lbLeaveButton');
            const rulesBtn    = document.getElementById('lnModeRuleButton');
            const startBtn    = document.getElementById('lbStartButton');
            const roomName    = document.getElementById('lobbyRoomNameContainer');
            const settingsBtn = document.getElementById('lnSettingsButton');

            setStyles(topBar, {
              'position': 'relative', 'height': '160px', 'width': '100vw',
              'max-width': '100vw', 'margin': '0', 'padding': '0',
              'box-sizing': 'border-box', 'overflow': 'visible'
            });

            let middleContainer = topBar.querySelector('#amqMobileMiddle');
            if (!middleContainer) {
              middleContainer = document.createElement('div');
              middleContainer.id = 'amqMobileMiddle';
            }

            setStyles(middleContainer, {
              'position': 'absolute', 'left': '10px', 'right': '0',
              'top': '0', 'bottom': '0', 'display': 'flex',
              'flex-direction': 'row', 'align-items': 'center',
              'justify-content': 'center', 'gap': '16px', 'pointer-events': 'none'
            });

            if (rulesBtn)  middleContainer.appendChild(rulesBtn);
            if (startBtn)  middleContainer.appendChild(startBtn);
            if (roomName)  middleContainer.appendChild(roomName);
            topBar.appendChild(middleContainer);

            [rulesBtn, startBtn, roomName].forEach(el => {
              if (el) setStyles(el, { 'pointer-events': 'auto' });
            });

            if (leaveBtn) {
              topBar.appendChild(leaveBtn);
              setStyles(leaveBtn, {
                'position': 'absolute', 'left': '0', 'top': '50%',
                'transform': 'skew(-35deg) translateY(-50%)',
                'width': '160px', 'height': '160px', 'display': 'flex',
                'align-items': 'center', 'justify-content': 'center', 'box-sizing': 'border-box'
              });
              const inner = leaveBtn.querySelector('.clickAble');
              if (inner) {
                setStyles(inner, {
                  'transform': 'skew(35deg)', 'display': 'flex',
                  'align-items': 'center', 'justify-content': 'center',
                  'width': '100%', 'height': '100%', 'font-size': '40px',
                  'margin': '0', 'padding': '0'
                });
              }
            }

            if (settingsBtn) {
              topBar.appendChild(settingsBtn);
              setStyles(settingsBtn, {
                'position': 'absolute', 'right': '0', 'top': '50%',
                'transform': 'translateY(-50%)', 'width': '200px', 'height': '160px',
                'display': 'flex', 'align-items': 'center', 'justify-content': 'center',
                'box-sizing': 'border-box'
              });
              settingsBtn.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
                setStyles(h, {
                  'font-size': '40px', 'margin': '0', 'padding': '0',
                  'line-height': '1', 'text-align': 'center'
                });
              });
            }

            [rulesBtn, startBtn].forEach(el => {
              if (!el) return;
              setStyles(el, {
                'display': 'flex', 'flex-direction': 'column',
                'align-items': 'center', 'justify-content': 'center',
                'width': '180px', 'height': '160px', 'box-sizing': 'border-box',
                'flex-shrink': '0', 'margin': '10px'
              });
              el.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
                setStyles(h, {
                  'font-size': '40px', 'margin': '0', 'padding': '0',
                  'line-height': '1', 'text-align': 'center',
                  'white-space': 'normal', 'word-break': 'break-word'
                });
              });
            });

            if (roomName) {
              setStyles(roomName, {
                'position': 'relative', 'top': 'auto', 'left': '180px', 'right': 'auto',
                'bottom': 'auto', 'display': 'flex', 'flex-direction': 'column',
                'align-items': 'center', 'justify-content': 'center',
                'width': '150px', 'height': '100px', 'box-sizing': 'border-box',
                'flex-shrink': '0', 'white-space': 'normal',
                'text-align': 'center', 'overflow': 'visible'
              });
              roomName.querySelectorAll('h5, h6').forEach(h => {
                setStyles(h, {
                  'margin': '0', 'padding': '0', 'line-height': '1.2',
                  'text-align': 'center', 'white-space': 'normal',
                  'word-break': 'break-word', 'font-size': '30px'
                });
              });
            }
          };

          // ---- Multiple choice answer buttons ----
          const applyMultipleChoiceLayout = () => {
            const mcContainer = document.getElementById('qpMultipleChoiceContainer');
            
            if (!mcContainer) return;
 
            const centerContainer = document.getElementById('qpAnimeCenterContainer');
            const parentRow = centerContainer?.parentElement;     // the row holding video + song info
            const grandParent = parentRow?.parentElement;          // the container that holds that row
 
          
 
            // Make sure grandParent doesn't clip or constrain mcContainer below the row
            if (grandParent) {
              setStyles(grandParent, {
                'overflow': 'visible',
                'height': 'auto',
                'min-height': '0'
              });
            }
 
            setStyles(mcContainer, {
              'position': 'static',
              'margin-top': '20px',
              'top': 'auto',
              'left': 'auto',
              'right': 'auto',
              'width': '100%',
              'box-sizing': 'border-box',
              'display': 'flex',
              'flex-direction': 'column',   // stack the two .qpMultipleChoiceRow divs
              'align-items': 'stretch',     // each row stretches to full width
              'row-gap': '190px'            // unchanged vertical rhythm between the two rows
            });
            
            const NEW_HEIGHT = 160; // px, must match entryContainer height below
            const COLUMN_GAP = 20;  // horizontal gap between the two buttons within a row
 
            // AMQ already groups the 4 answers into two .qpMultipleChoiceRow divs of
            // 2 each — style that real wrapper as a full-width flex row, rather than
            // treating the 4 entries as direct flex children of mcContainer (which
            // they aren't — they're one level deeper, inside these rows).
            mcContainer.querySelectorAll(".qpMultipleChoiceRow").forEach((row, i) => {

              setStyles(row, {
                width: "100%",
                height: NEW_HEIGHT + "px",      // <-- add this
                minHeight: NEW_HEIGHT + "px",   // <-- and this
                display: "flex",
                "flex-direction": "row",
                "align-items": "stretch",
                "column-gap": COLUMN_GAP + "px",
                margin: "0",
                float: "none"
            });
          });
 
            mcContainer.querySelectorAll('.qpMultipleChoiceEntryContainer').forEach(entryContainer => {
 
              // Capture the box's ORIGINAL height (AMQ's own layout height, before we touch it)
              // only once, so repeated passes always scale from the same baseline.
              if (!entryContainer.dataset.amqOrigHeight) {
                const rect = entryContainer.getBoundingClientRect();
                entryContainer.dataset.amqOrigHeight = rect.height || 90; // fallback if 0 (not yet rendered)
              }
              const origHeight = parseFloat(entryContainer.dataset.amqOrigHeight);
              const scale = NEW_HEIGHT / origHeight;
 
              setStyles(entryContainer, {
                // Two per row filling 100% width: 2 * (50% - gap/2) + gap = 100%
                // Now resolves correctly since the row (its actual parent) has width: 100%.
                'width': 'calc(50% - ' + (COLUMN_GAP / 2) + 'px)',
                'min-width': '140px',
                'height': NEW_HEIGHT + 'px',
                'min-height': '90px',
                'margin': '0',
                'box-sizing': 'border-box',
                'float': 'none'
              });

 
              entryContainer.querySelectorAll(
                '.qpMultipleChoiceEntryShadow, .qpMultipleChoiceEntryContainerInner, .qpMultipleChoiceEntry, .qpMultipleChoiceEntryTextContainer'
              ).forEach(inner => {
                setStyles(inner, {
                  'width': '100%',
                  'height': '100%',
                  'box-sizing': 'border-box',
                  'transform': 'skew(-10deg)'
                });
              });
 
              const textContainer = entryContainer.querySelector('.qpMultipleChoiceEntryTextContainer');
              if (textContainer) {
                setStyles(textContainer, {
                  'width': '100%',
                  'height': '100%',
                  'min-height': '100%',
                  'box-sizing': 'border-box',
                  'display': 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  'position': 'static',
                  'top': 'auto',
                  'left': 'auto',
                  'transform': 'skew(10deg)'
                });
              }
 
              const clickEntry = entryContainer.querySelector('.qpMultipleChoiceEntry');
              if (clickEntry) {
                setStyles(clickEntry, {
                  'display': 'flex',
                  'align-items': 'center',
                  'justify-content': 'center'
                });
              }
 
              // Scale AMQ's auto-fit font-size proportionally, scoped to THIS entry only
              entryContainer.querySelectorAll('.qpMultipleChoiceEntryText').forEach(textEl => {
                if (!textEl.dataset.amqOrigFontSize) {
                  const currentSize = parseFloat(getComputedStyle(textEl).fontSize) || 18;
                  textEl.dataset.amqOrigFontSize = currentSize;
                }
                const origFontSize = parseFloat(textEl.dataset.amqOrigFontSize);
                const newFontSize = Math.min(origFontSize * scale, 32); // cap so short titles don't get huge
 
                setStyles(textEl, {
                  'font-size': newFontSize + 'px',
                  'white-space': 'normal',
                  'word-break': 'break-word',
                  'text-align': 'center',
                  'width': '100%'
                });
              });
            });
          };

          // ---- Center column: video player, anime name, overlays ----
          const applyQuizCenterLayout = () => {
            const centerContainer = document.getElementById('qpAnimeCenterContainer');
            if (!centerContainer) return;

            setStyles(centerContainer, {
                'flex': '1 1 80%',
                position: "relative",
                top: "auto",
                transform: "translateY(25%)",
                width: "100%",
                display: "flex",
                'margin-right': '10px',
                "flex-direction": "column",
                "align-items": "stretch"
            });

            setStyles(document.getElementById('qpCenterInfoContainer'), {
              'width': '100%',
              'text-align': 'center'
            });

            setStyles(document.getElementById('qpAnimeNameContainer'), {
              'width': '100%',
              'height': '100px',
              'text-align': 'center',
              'margin': '0 auto'
            });

            setStyles(document.getElementById('qpAnimeNameHider'), {
              'width': '95%',
              'height': '100px',
              'text-align': 'center',
              'margin': '0 auto'
            });

            setStyles(document.getElementById('qpAnimeName'), {
              'font-size': '40px',
              'line-height': '1.2',
              'text-align': 'center'
            });

            setStyles(document.getElementById("qpVideoContainerOuter"),{
                width:"100%",
                display:"flex",
                "justify-content":"center"
            });

            setStyles(document.getElementById("qpVideoContainer"),{
                width:"100%",
                "max-width":"900px",
                "aspect-ratio":"16 / 9"
            });

            setStyles(document.getElementById('qpVideoContainerInner'), {
              'width': '100%',
              'margin': '0 auto',
              'left': '0',
              'right': '0',
              'top': '10px'
            });

            ['#qpVideosUserHidden', '#qpVideoHider', '#qpTinyModeVideoHider', '#qpHiderText', '#qpExtraTimeCounter']
              .forEach(sel => {
                const el = document.querySelector(sel);
                if (el) setStyles(el, { 'font-size': '28px' });
              });
          };

          

          // ---- Side song info panel (next to video) ----
          // qpAnimeCenterContainer and the col-xs-3 wrapper around qpSongInfoContainer
          // are flex siblings in the same row. We give that row align-items: stretch
          // and neither sibling an explicit height — flexbox then makes both columns
          // match the taller one's height on its own, every reflow, automatically.
          // (An earlier version tried to compute this height in JS from
          // qpVideoContainerOuter + qpAnimeNameContainer and set it as a fixed px
          // value on sideWrapper. That's fragile: if either element briefly measured
          // 0 height — e.g. mid-transition between songs — the wrapper would get
          // pinned to ~10px and the whole panel would appear to vanish. Letting
          // flexbox handle it avoids that failure mode entirely.)
          const SIDE_WRAPPER_MARKER = 'amqSongInfoSideWrapper';

          // Finds { centerContainer, songInfo, sideWrapper, parentRow }, or null.
          // Looks for sideWrapper via our own marker class first, falling back to
          // Bootstrap's 'col-xs-3' — necessary because we strip 'col-xs-3' below,
          // so relying on it alone would only work on the very first pass.
          const getQuizSideColumns = () => {
            const centerContainer = document.getElementById('qpAnimeCenterContainer');
            const songInfo = document.getElementById('qpSongInfoContainer');
            if (!centerContainer || !songInfo) return null;

            const sideWrapper =
              songInfo.closest('.' + SIDE_WRAPPER_MARKER) ||
              songInfo.closest('.col-xs-3');
            if (!sideWrapper) return null;

            const parentRow = centerContainer.parentElement;
            if (!parentRow || parentRow !== sideWrapper.parentElement) return null;

            return { centerContainer, songInfo, sideWrapper, parentRow };
          };

          const applySongInfoLayout = () => {
            const cols = getQuizSideColumns();
            if (!cols) return;
            const { songInfo, sideWrapper } = cols;

            

            const standingContainer = document.getElementById("qpStandingContainer");
            const leftWrapper = standingContainer?.closest(".col-xs-3");

            if (standingContainer && standingContainer.parentElement !== sideWrapper) {
                sideWrapper.appendChild(standingContainer);
            }

            if (leftWrapper && leftWrapper !== sideWrapper) {
                leftWrapper.style.setProperty("display", "none", "important");
            }
                
            // Tag it once so future passes can find it via our own class even
            // after 'col-xs-3' is gone.
            sideWrapper.classList.add(SIDE_WRAPPER_MARKER);
            sideWrapper.classList.remove('col-xs-3');

            

            setStyles(sideWrapper, {
              'flex': '1 1 20%',
              'position': 'static',
              'float': 'none',
              'top': 'auto',
              'left': 'auto',
              'right': 'auto',
              'height': 'auto',        // let row stretch determine the baseline height
              'min-height': '0',       // bump this (e.g. '500px') to force it taller than                       
              'box-sizing': 'border-box',
              'margin-right': '30px',
              'margin-left': '10px',
              'padding': '0',
              'order': '2',
              // Flex column so content (qpSongInfoContainer) can be pushed down
              // later (margin-top, justify-content, etc.) without extra wrappers.
              'display': 'flex',
              'flex-direction': 'column'
            });

            setStyles(songInfo, {
              'flex': '1 1 auto',
              'width': '100%',
              'box-sizing': 'border-box',
              'padding': '20px',
              'overflow-y': 'auto',
              'min-height': '20vh',
              'max-height': '20vh',
              'transform': 'translateY(30%)', 
            });

            setStyles(qpInfoHider, {
              'flex': '1 1 auto',
              'width': '100%',
              'height': '150%',
              'box-sizing': 'border-box',
              'padding': '20px',
              'overflow-y': 'auto',
              'min-height': '20vh',
              'max-height': '20vh',
              'margin-top': '0px'   // pushes it down within the column — tweak/remove as needed
            });

            setStyles(standingContainer, {
                'flex': '0 0 auto',
                'height': 'auto', 
                'transform': 'translateY(130%)',
                'order': '3'
            });

            if (standingContainer) {
              standingContainer.querySelectorAll('.qpScoreBoardEntry, .qpScoreBoardEntry *').forEach(el => {
                setStyles(el, { 'font-size': '30px' });
              });
 
              standingContainer.querySelectorAll('.qpScoreBoardNumber, .qpScoreBoardNumber *').forEach(el => {
                setStyles(el, { 'font-size': '40px', 'margin-top': '-15px' });
              });
            }

            songInfo.querySelectorAll('h3, h5, p, span, a, i').forEach(el => {
              setStyles(el, {
                'font-size': '30px',
                'line-height': '1.2',
                'white-space': 'normal',
                'word-break': 'break-word',
                'margin': '2px 0',
                'padding': '0'
              });
            });

            songInfo.querySelectorAll('h3').forEach(el => {
              setStyles(el, { 'font-size': '13px' });
            });
          };

          const applyQuizRowLayout = () => {
            const cols = getQuizSideColumns();
            if (!cols) return;
            const { parentRow } = cols;

            setStyles(parentRow, {
              'display': 'flex',
              'flex-direction': 'row',
              'align-items': 'stretch',
              'width': '100%',
              'max-width': '100vw',
              'margin': '0',
              'padding': '0',
              'box-sizing': 'border-box',
              'float': 'none'
            });

            const grandParent = parentRow.parentElement;
            if (grandParent) {
              setStyles(grandParent, {
                'width': '100%',
                'max-width': '100vw',
                'margin': '0',
                'padding': '0',
                'box-sizing': 'border-box'
              });
            }
          };

          


          // ---- Top-left action buttons (Leave, Return to Lobby, Pause) ----
          const applyQuizLeftButtonsLayout = () => {
            const leftButtonIds = ['qpLeaveButton', 'qpReturnToLobbyButton', 'qpPauseButton'];
            const SIZE = 150; // px, square button
            const TOP_OFFSET = 10; // lower this if buttons collide with other floating UI

            leftButtonIds.forEach((id, index) => {
              const btn = document.getElementById(id);
              if (!btn) return;

              setStyles(btn, {
                'position': 'fixed',
                'top': TOP_OFFSET + 'px',
                'left': (10 + index * (SIZE + 8)) + 'px', // stack horizontally with spacing
                'right': 'auto',
                'width': SIZE + 'px',
                'height': SIZE + 'px',
                'box-sizing': 'border-box',
                'display': 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'z-index': '999'
              });

              btn.querySelectorAll('i').forEach(icon => {
                setStyles(icon, {
                  'font-size': '70px'
                });
              });

              btn.querySelectorAll('p').forEach(p => {
                setStyles(p, {
                  'font-size': '40px',
                  'margin': '0',
                  'padding': '0',
                  'text-align': 'center',
                  'line-height': '1.1'
                });
              });
            });
          };

          // ---- Top-right option icons (Quality, Settings, Song History) ----
          const applyQuizRightButtonsLayout = () => {
            const optionContainer = document.getElementById('qpOptionContainer');
            if (!optionContainer) return;

            setStyles(optionContainer, {
              'position': 'fixed',
              'width': '260px',
              'height': '150px',
              'top': '10px',
              'right': '10px',
              'left': 'auto',
              'display': 'flex',
              'flex-direction': 'row',
              'align-items': 'center',
              'gap': '12px',
              'z-index': '999'
            });

            optionContainer.querySelectorAll('.qpOption').forEach(opt => {
              setStyles(opt, {
                'width': '60px',
                'height': '70px',
                'top': '30px',
                'transform': 'translateX(50%)', 
                'margin': '10px',
                'display': 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'box-sizing': 'border-box'   
              });

              opt.querySelectorAll('i').forEach(icon => {
                setStyles(icon, {
                  'font-size': '70px'
                });
              });
            });
          };

            document.querySelectorAll('#qpQualityList li').forEach(el => {
              el.style.setProperty('font-size', '60px', 'important');
              el.style.setProperty('height', 'auto', 'important');
              el.style.setProperty('line-height', '80px', 'important');
              el.style.setProperty('width', '100%', 'important');
            });

          const hideVolumeControls = () => {
            ['qpVolumeBar', 'qpVolumeIcon'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.style.setProperty('display', 'none', 'important');
            });
          };

          const hideAvatarContainer = () => {
            ['qpAvatarRowAvatarContainer'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.style.setProperty('display', 'none', 'important');
            });
          };

          const hideStickOut = () => {
            ['qcStickOut'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.style.setProperty('display', 'none', 'important');
            });
          };

          const hideSongHistory = () => {
            ['qpSongHistory'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.style.setProperty('display', 'none', 'important');
            });
          };

          const hideOptionContainerHider = () => {
            ['qpOptionContainerHider'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.style.setProperty('display', 'none', 'important');
            });
          };

          // ---- Everything that should run on every pass ----
          const runLayoutPass = () => {

            hideSelectors([
              '#gameChatContainer', '#gcContainer', '#gcMessageContainer',
              '#gcInputContainer', '#footerBar', '#bottomBar',
              '#qpRightContainer', '#brPlayerListContainer'
              // qpStandingContainer handled separately below — needs wrapper hidden, not just itself
            ]);

            setStyles(document.body, { margin: '0', padding: '0', overflow: 'hidden' });

            setStyles(document.getElementById('gameContainer'), {
              'background-repeat': 'no-repeat',
              'background-size': 'cover',
              'background-position': 'center center',
              'background-attachment': 'fixed'
            });

            setStyles(document.getElementById('mainContainer'), {
              'min-width': '0', 'min-height': '0', 'width': '100%', 'height': '100%'
            });

            setStyles(document.getElementById('gameChatPage'), {
              'height': '100%', 'padding-right': '0'
            });

            document.querySelectorAll('.ps__rail-y, .ps__rail-x, .ps__thumb-y, .ps__thumb-x')
              .forEach(el => setStyles(el, { 'background-repeat': 'no-repeat', 'background-size': 'contain' }));

            setStyles(document.getElementById('lobbyAvatarContainer'), {
              'position': 'relative', 'top': '0', 'height': '100%',
              'padding-top': '10px', 'overflow-y': 'auto'
            });

            setStyles(document.getElementById('brMap'), {
              'position': 'absolute', 'top': '90px', 'left': '49.5%',
              'transform': 'translateX(-50%) scale(1.07)', 'transform-origin': 'top center'
            });

            setStyles(document.querySelector('#battleRoyalPage > .col-xs-9'), {
              'position': 'relative', 'padding': '0', 'margin': '0', 'min-height': '100vh'
            });

            setStyles(document.getElementById('battleRoyalPage'), {
              'padding-top': '100px', 'padding-bottom': '100px'
            });

            setStyles(document.getElementById('brLeftContainer'), { 'display': 'none' });

            const mapContainer = document.getElementById('brMapContainer');
            if (mapContainer) {
              mapContainer.className = '';
              setStyles(mapContainer, {
                'position': 'fixed', 'top': '220px', 'left': '0',
                'width': '100vw', 'height': 'calc(100vh - 180px)',
                'margin': '0', 'padding': '0', 'display': 'flex',
                'justify-content': 'center', 'align-items': 'flex-start', 'z-index': '1'
              });
            }

            setStyles(document.querySelector('#mainContainer .col-xs-9'), { 'background-image': 'none' });
            setStyles(document.getElementById('mainContainer'), { 'background-image': 'none' });

            setStyles(document.getElementById('gameContainer'), {
              'background-image': 'url("https://animemusicquiz.com/cdn/v1/ui/backgrounds/blur/1920px/game-bg.webp")',
              'background-repeat': 'no-repeat',
              'background-size': 'cover',
              'background-position': 'center center',
              'background-attachment': 'fixed'
            });

            setStyles(document.querySelector('#gameChatPage > .col-xs-9'), {
              'width': '100vw', 'max-width': '100vw',
              'padding-left': '0', 'padding-right': '0', 'float': 'none'
            });

            applyTopBarLayout();
            applyMultipleChoiceLayout();
            applyQuizRowLayout();
            applyQuizCenterLayout();
            applySongInfoLayout();
            applyQuizLeftButtonsLayout();
            applyQuizRightButtonsLayout();
            hideVolumeControls();
            hideAvatarContainer();
            hideStickOut();
            hideSongHistory();
            hideOptionContainerHider();
            applyVideoSkipLayout();
          };

          runLayoutPass();

          if (window.__amqMobileObserver) {
            window.__amqMobileObserver.disconnect();
          }

          let debounceTimer = null;
          window.__amqMobileObserver = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runLayoutPass, 100);
          });

          window.__amqMobileObserver.observe(document.body, {
            childList: true,
            subtree: true
          });

        } catch (e) {
          window.ReactNativeWebView.postMessage('ERROR ' + e.message);
        }
      })();
      true;
    `);
  };



  const debugBRBoxes = () => {
    webviewRef.current?.injectJavaScript(`
      try {

        const ids = [
          'gameContainer',
          'battleRoyalPage',
          'brMapContainer',
          'brMap',
          'brMapContent'
        ];

        const result = ids.map(id => {

          const el = document.getElementById(id);

          if (!el) return null;

          return {
            id,

            width: el.offsetWidth,

            height: el.offsetHeight,

            top: el.getBoundingClientRect().top,

            left: el.getBoundingClientRect().left
          };

        });

        window.ReactNativeWebView.postMessage(
          JSON.stringify(result)
        );

      } catch(e) {}

      true;
    `);
  };

  const debugBattleRoyalChildren = () => {
    webviewRef.current?.injectJavaScript(`
      try {

        const page = document.getElementById('battleRoyalPage');

        if (!page) {
          window.ReactNativeWebView.postMessage('NO_PAGE');
        } else {

          const result =
            [...page.children].map(el => ({
              id: el.id,

              className: el.className,

              width: el.offsetWidth,

              height: el.offsetHeight,

              top: el.getBoundingClientRect().top
            }));

          window.ReactNativeWebView.postMessage(
            JSON.stringify(result)
          );
        }

      } catch(e) {

        window.ReactNativeWebView.postMessage(
          'ERROR ' + e.message
        );

      }

      true;
    `);
  };

  const debugVisibleRows = () => {
    webviewRef.current?.injectJavaScript(`
      const page = document.getElementById('battleRoyalPage');

      if (!page) {
        window.ReactNativeWebView.postMessage('NO_PAGE');
      } else {

        const rows = [...page.children]
          .filter(el => el.offsetHeight > 0)
          .map(el => ({
            id: el.id,
            className: el.className,
            height: el.offsetHeight
          }));

        window.ReactNativeWebView.postMessage(
          JSON.stringify(rows)
        );
      }

      true;
    `);
  };

  const debugMapChildren = () => {
    webviewRef.current?.injectJavaScript(`
      try {

        const container =
          document.getElementById('brMapContainer');

        if (!container) {
          window.ReactNativeWebView.postMessage('NO_CONTAINER');
        } else {

          const result =
            [...container.querySelectorAll('*')]
            .filter(el => el.offsetHeight > 0)
            .filter(el =>
              el.id ||
              el.className
            )
            .map(el => ({
              id: el.id,
              className: el.className,
              top: Math.round(
                el.getBoundingClientRect().top
              ),
              height: el.offsetHeight
            }))
            .slice(0, 25);

          window.ReactNativeWebView.postMessage(
            JSON.stringify(result)
          );
        }

      } catch(e) {}

      true;
    `);
  };

  const debugMapParents = () => {
    webviewRef.current?.injectJavaScript(`
      try {

        let el = document.getElementById('brMap');

        const result = [];

        while (el) {

          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();

          result.push({

            id: el.id || el.tagName,

            className: el.className,

            top: Math.round(rect.top),

            position: style.position,

            display: style.display,

            marginTop: style.marginTop,

            paddingTop: style.paddingTop,

            transform: style.transform,

            height: style.height
          });

          el = el.parentElement;
        }

        window.ReactNativeWebView.postMessage(
          JSON.stringify(result)
        );

      } catch(e) {

        window.ReactNativeWebView.postMessage(
          'ERROR ' + e.message
        );

      }

      true;
    `);
  };

  const debugButtons = () => {
    webviewRef.current?.injectJavaScript(`
      try {

        const candidates = [
          '#lbStartButton',
          '#lbLeaveButton',

          '#brReturnToMapButton',

          '.topRightBackButton',

          '#footerBar',
          '#bottomBar',

          '#qpAvatarContainer'
        ];

        const result = [];

        candidates.forEach(selector => {

          const el = document.querySelector(selector);

          if (!el) return;

          const rect = el.getBoundingClientRect();

          result.push({

            selector,

            top: Math.round(rect.top),

            bottom: Math.round(rect.bottom),

            height: Math.round(rect.height)
          });

        });

        window.ReactNativeWebView.postMessage(
          JSON.stringify(result)
        );

      } catch(e) {}

      true;
    `);
  };

  const debugBottomElements = () => {
    webviewRef.current?.injectJavaScript(`
      try {

        const result = [];

        [...document.querySelectorAll('*')]
          .forEach(el => {

            const rect = el.getBoundingClientRect();

            if (
              rect.height > 20 &&
              rect.top > window.innerHeight - 250
            ) {

              result.push({

                id: el.id,

                className: el.className,

                top: Math.round(rect.top),

                bottom: Math.round(rect.bottom),

                height: Math.round(rect.height)

              });

            }

          });

        window.ReactNativeWebView.postMessage(
          JSON.stringify(result.slice(0, 25))
        );

      } catch(e) {}

      true;
    `);
  };

  const debugScreen = () => {
    webviewRef.current?.injectJavaScript(`
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          innerHeight: window.innerHeight,
          outerHeight: window.outerHeight,
          visualViewport: window.visualViewport?.height
        })
      );

      true;
    `);
  };

  const debugRealBackgrounds = () => {
    webviewRef.current?.injectJavaScript(`
      try {
        const results = [];

        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundImage;

          // Only include real images, skip gradients
          if (bg && bg.startsWith('url(')) {
            results.push({
              id: el.id || null,
              className: el.className || null,
              tag: el.tagName.toLowerCase(),
              backgroundImage: bg,
              backgroundRepeat: style.backgroundRepeat,
              backgroundSize: style.backgroundSize,
              backgroundPosition: style.backgroundPosition
            });
          }
        });

        window.ReactNativeWebView.postMessage(
          JSON.stringify(results)
        );

      } catch (e) {
        window.ReactNativeWebView.postMessage('ERROR ' + e.message);
      }

      true;
    `);
  };

  // Dumps the quiz row (qpAnimeCenterContainer + song-info column) and every
  // child of that row, with real rendered widths, so we can see what's eating
  // horizontal space — including any sibling that's still occupying width
  // even though it "should" be hidden.
  const debugSongInfoSpace = () => {
    webviewRef.current?.injectJavaScript(`
      try {
        const centerContainer = document.getElementById('qpAnimeCenterContainer');
        const songInfo = document.getElementById('qpSongInfoContainer');
        const sideWrapper =
          songInfo?.closest('.amqSongInfoSideWrapper') ||
          songInfo?.closest('.col-xs-3');
        const parentRow = centerContainer?.parentElement;
        const grandParent = parentRow?.parentElement;

        const describe = (el) => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            id: el.id || null,
            className: el.className || null,
            rect: {
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            display: cs.display,
            visibility: cs.visibility,
            position: cs.position,
            flex: cs.flex,
            width: cs.width,
            maxWidth: cs.maxWidth,
            marginLeft: cs.marginLeft,
            marginRight: cs.marginRight,
            paddingLeft: cs.paddingLeft,
            paddingRight: cs.paddingRight,
            boxSizing: cs.boxSizing,
            overflow: cs.overflow
          };
        };

        // Every direct child of the row — reveals any extra sibling
        // (e.g. a not-fully-hidden chat/right container) still claiming space.
        const rowChildren = parentRow
          ? [...parentRow.children].map(describe)
          : [];

        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            grandParent: describe(grandParent),
            parentRow: describe(parentRow),
            rowChildrenCount: rowChildren.length,
            rowChildren,
            centerContainer: describe(centerContainer),
            sideWrapper: describe(sideWrapper),
            songInfo: describe(songInfo)
          }, null, 2)
        );

      } catch (e) {
        window.ReactNativeWebView.postMessage('ERROR ' + e.message);
      }

      true;
    `);
  };

  const debugMultipleChoiceLayout = () => {
    webviewRef.current?.injectJavaScript(`
      try {
        const mcContainer = document.getElementById('qpMultipleChoiceContainer');
 
        const describe = (el) => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            id: el.id || null,
            className: el.className || null,
            rect: {
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            display: cs.display,
            visibility: cs.visibility,
            position: cs.position,
            transform: cs.transform,
            overflow: cs.overflow,
            zIndex: cs.zIndex,
            width: cs.width,
            height: cs.height,
            rowGap: cs.rowGap,
            columnGap: cs.columnGap,
            flexDirection: cs.flexDirection,
            flexWrap: cs.flexWrap
          };
        };
 
        const rows = mcContainer
          ? [...mcContainer.querySelectorAll('.qpMultipleChoiceRow')].map(row => ({
              row: describe(row),
              entries: [...row.querySelectorAll('.qpMultipleChoiceEntryContainer')].map(describe)
            }))
          : [];
 
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            mcContainer: describe(mcContainer),
            rowCount: rows.length,
            rows
          }, null, 2)
        );
 
      } catch (e) {
        window.ReactNativeWebView.postMessage('ERROR ' + e.message);
      }
 
      true;
    `);
  };

  const debugAvatarContainers = () => {
    webviewRef.current?.injectJavaScript(`
      try {

        const selectors = [
          '[class*="qpAvatarRowAvatarContainer"]',
          '[class*="qpAvatarContainerOuter"]'
        ];

        const result = [];

        selectors.forEach(selector => {

          const els = document.querySelectorAll(selector);

          els.forEach(el => {

            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);

            // walk up a few ancestors too, since the parent
            // may be what's actually constraining position
            const ancestors = [];
            let parent = el.parentElement;
            for (let i = 0; i < 3 && parent; i++) {
              const pRect = parent.getBoundingClientRect();
              const pStyle = window.getComputedStyle(parent);
              ancestors.push({
                tag: parent.tagName.toLowerCase(),
                className: parent.className,
                id: parent.id,
                top: Math.round(pRect.top),
                bottom: Math.round(pRect.bottom),
                height: Math.round(pRect.height),
                position: pStyle.position,
                overflow: pStyle.overflow
              });
              parent = parent.parentElement;
            }

            result.push({
              selector,
              tag: el.tagName.toLowerCase(),
              id: el.id,
              className: el.className,
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
              height: Math.round(rect.height),
              position: style.position,
              top_prop: style.top,
              marginTop: style.marginTop,
              paddingTop: style.paddingTop,
              transform: style.transform,
              ancestors
            });

          });

        });

        window.ReactNativeWebView.postMessage(
          JSON.stringify(result)
        );

      } catch(e) {

        window.ReactNativeWebView.postMessage(
          'ERROR ' + e.message
        );

      }

      true;
    `);
  };

  const debugQualityDropdown = () => {
  webviewRef.current?.injectJavaScript(`
    try {

      const results = [];

      // search broadly for anything containing quality option text
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent?.trim() || '';
        if (
          el.children.length === 0 &&
          (text === '720p' || text === '480p' || text === 'Sound' || /^\\d+p$/.test(text))
        ) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          results.push({
            text,
            tag: el.tagName.toLowerCase(),
            className: el.className,
            id: el.id,
            fontSize: style.fontSize,
            padding: style.padding,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            parentClassName: el.parentElement?.className,
            parentId: el.parentElement?.id
          });
        }
      });

      window.ReactNativeWebView.postMessage(
        JSON.stringify(results, null, 2)
      );

    } catch(e) {

      window.ReactNativeWebView.postMessage(
        'ERROR ' + e.message
      );

    }

    true;
  `);
};

  
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1 }}
        edges={['top', 'bottom']}
      >
        <WebView
          ref={webviewRef}
          source={{ uri: "https://animemusicquiz.com" }}
          injectedJavaScript={injectedJS}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onMessage={(event) => {
            console.log("[WEBVIEW]", event.nativeEvent.data);
          }}
          onLoadEnd={() => {
            setTimeout(() => {
              applyMobileLayout();
            }, 500);
          }}
        />

        {/* Floating toggle button */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => {
            setShowControls((prev) => !prev);
            applyMobileLayout();
          }}
        >
          <Text style={styles.toggleText}>↑←↓→</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 50,
              left: 20,
              backgroundColor: "blue",
              padding: 10,
              zIndex: 9999,
            }}
            onPress={debugQualityDropdown}
          >
            <Text style={{ color: "white" }}>DEBUG</Text>
          </TouchableOpacity>
        )}

        {/* Arrow key control panel */}
        {showControls && (
          <View style={styles.controls}>
            <View style={styles.row}>
              <Pressable
                style={styles.key}
                onPressIn={() => setDirection("up", true)}
                onPressOut={() => {
                  setDirection("up", false);
                  releaseAll();
                }}
              >
                <Text style={styles.keyText}>↑</Text>
              </Pressable>
            </View>

            <View style={styles.row}>
              <Pressable
                style={styles.leftKey}
                onPressIn={() => setDirection("left", true)}
                onPressOut={() => {
                  setDirection("left", false);
                  releaseAll();
                }}
              >
                <Text style={styles.keyText}>←</Text>
              </Pressable>

              <Pressable
                style={styles.key}
                onPressIn={() => setDirection("down", true)}
                onPressOut={() => {
                  setDirection("down", false);
                  releaseAll();
                }}
              >
                <Text style={styles.keyText}>↓</Text>
              </Pressable>

              <Pressable
                style={styles.rightKey}
                onPressIn={() => setDirection("right", true)}
                onPressOut={() => {
                  setDirection("right", false);
                  releaseAll();
                }}
              >
                <Text style={styles.keyText}>→</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    position: "absolute",
    bottom: 80,
    left: 10,
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 50,
  },
  toggleText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  controls: {
    position: "absolute",
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  row: {
    flexDirection: "row",
    marginVertical: 5,
  },
  key: {
    backgroundColor: "#444",
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 10,
  },
  leftKey: {
    marginTop: -42,
    marginBottom: 35,
    backgroundColor: "#444",
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 10,
  },

  rightKey: {
    marginTop: -42,
    marginBottom: 35,
    backgroundColor: "#444",
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 10,
  },
  keyText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
});