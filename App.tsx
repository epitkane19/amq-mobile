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

      #gameChatPage > .col-xs-9,
      #battleRoyalPage > .col-xs-9 {
          width: 100% !important;
          max-width: 100% !important;
          flex: 0 0 100% !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
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
      try {

        // Helper: apply multiple CSS properties cleanly
        const setStyles = (el, styles) => {
          if (!el) return;
          Object.entries(styles).forEach(([prop, value]) => {
            el.style.setProperty(prop, value, 'important');
          });
        };

        // Helper: hide multiple selectors
        const hideSelectors = selectors => {
          selectors.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.setProperty('display', 'none', 'important');
          });
        };


        // Hide desktop-only UI
        hideSelectors([
          '#gameChatContainer',
          '#gcContainer',
          '#gcMessageContainer',
          '#gcInputContainer',
          '#footerBar',
          '#bottomBar',
          '#qpSideContainer',
          '#qpRightContainer',
          '#brPlayerListContainer'
        ]);


        // Make body fullscreen
        setStyles(document.body, {
          margin: '0',
          padding: '0',
          overflow: 'hidden'
        });


        // Fix game background
        const gameContainer = document.getElementById('gameContainer');
        setStyles(gameContainer, {
          'background-repeat': 'no-repeat',
          'background-size': 'cover',
          'background-position': 'center center',
          'background-attachment': 'fixed'
        });


        // Fix main container forcing desktop layout
        const mainContainer = document.getElementById('mainContainer');
        setStyles(mainContainer, {
          'min-width': '0',
          'min-height': '0',
          'width': '100%',
          'height': '100%'
        });


        // Fix gameChatPage height calc(-45px + 100vh)
        const gameChatPage = document.getElementById('gameChatPage');
        setStyles(gameChatPage, {
          'height': '100%',
          'padding-right': '0'
        });


        // Fix PerfectScrollbar repeating backgrounds
        document.querySelectorAll('.ps__rail-y, .ps__rail-x, .ps__thumb-y, .ps__thumb-x')
          .forEach(el => {
            setStyles(el, {
              'background-repeat': 'no-repeat',
              'background-size': 'contain'
            });
          });


        // Stabilize lobby avatar container
        const lobbyAvatar = document.getElementById('lobbyAvatarContainer');
        setStyles(lobbyAvatar, {
          'position': 'relative',
          'top': '0',
          'height': '100%',
          'padding-top': '10px',
          'overflow-y': 'auto'
        });


        // Battle Royale layout fixes
        const map = document.getElementById('brMap');
        setStyles(map, {
          'position': 'absolute',
          'top': '90px',
          'left': '50%',
          'transform': 'translateX(-50%) scale(1.07)',
          'transform-origin': 'top center'
        });

        const wrapper = document.querySelector('#battleRoyalPage > .col-xs-9');
        setStyles(wrapper, {
          'position': 'relative',
          'padding': '0',
          'margin': '0',
          'min-height': '100vh'
        });


        const page = document.getElementById('battleRoyalPage');
        setStyles(page, {
          'padding-top': '100px',
          'padding-bottom': '100px'
        });

        const left = document.getElementById('brLeftContainer');
        setStyles(left, { 'display': 'none' });

        const mapContainer = document.getElementById('brMapContainer');
        if (mapContainer) {
          mapContainer.className = ''; // break Bootstrap layout
          setStyles(mapContainer, {
            'position': 'fixed',
            'top': '220px',
            'left': '0',
            'width': '100vw',
            'height': 'calc(100vh - 180px)',
            'margin': '0',
            'padding': '0',
            'display': 'flex',
            'justify-content': 'center',
            'align-items': 'flex-start',
            'z-index': '1'
          });
        }

        // Remove blurred background from Bootstrap column
        const blurredBg = document.querySelector('#mainContainer .col-xs-9');
        setStyles(blurredBg, { 'background-image': 'none' });

        // Remove clear background from mainContainer
        setStyles(document.getElementById('mainContainer'), {
          'background-image': 'none'
        });

        // Apply unified fullscreen blurred background
        const game = document.getElementById('gameContainer');
        setStyles(game, {
          'background-image': 'url("https://animemusicquiz.com/cdn/v1/ui/backgrounds/blur/1920px/game-bg.webp")',
          'background-repeat': 'no-repeat',
          'background-size': 'cover',
          'background-position': 'center center',
          'background-attachment': 'fixed'
        });

        // Make the left column full width
        const col = document.querySelector('#gameChatPage > .col-xs-9');
        setStyles(col, {
          'width': '100vw',
          'max-width': '100vw',
          'padding-left': '0',
          'padding-right': '0',
          'float': 'none'
        });

        // --- topMenuBar: idempotent rebuild ---
        const topBar = document.querySelector('#lobbyPage .topMenuBar');
        if (topBar) {
          const leaveBtn    = document.getElementById('lbLeaveButton');
          const rulesBtn    = document.getElementById('lnModeRuleButton');
          const startBtn    = document.getElementById('lbStartButton');
          const roomName    = document.getElementById('lobbyRoomNameContainer');
          const settingsBtn = document.getElementById('lnSettingsButton');

          // Bar: relative so absolute children anchor to it
          setStyles(topBar, {
            'position': 'relative',
            'height': '160px',
            'width': '100vw',
            'max-width': '100vw',
            'margin': '0',
            'padding': '0',
            'box-sizing': 'border-box',
            'overflow': 'visible'
          });

          // Idempotent middle container: reuse if already injected
          let middleContainer = topBar.querySelector('#amqMobileMiddle');
          if (!middleContainer) {
            middleContainer = document.createElement('div');
            middleContainer.id = 'amqMobileMiddle';
          }

          // Middle container spans the full bar and centers its children
          setStyles(middleContainer, {
            'position': 'absolute',
            'left': '10px',
            'right': '0',
            'top': '0',
            'bottom': '0',
            'display': 'flex',
            'flex-direction': 'row',
            'align-items': 'center',
            'justify-content': 'center',
            'gap': '16px',
            'pointer-events': 'none'
          });

          // Move elements into their final positions (safe to repeat)
          if (rulesBtn)  middleContainer.appendChild(rulesBtn);
          if (startBtn)  middleContainer.appendChild(startBtn);
          if (roomName)  middleContainer.appendChild(roomName);
          topBar.appendChild(middleContainer);

          // Re-enable pointer events on middle buttons
          [rulesBtn, startBtn, roomName].forEach(el => {
            if (el) setStyles(el, { 'pointer-events': 'auto' });
          });

          // Leave: pinned to left edge, absolutely
          if (leaveBtn) {
            topBar.appendChild(leaveBtn);
            setStyles(leaveBtn, {
              'position': 'absolute',
              'left': '0',
              'top': '50%',
              'transform': 'skew(-35deg) translateY(-50%)',
              'width': '160px',
              'height': '160px',
              'display': 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              'box-sizing': 'border-box'
            });
            const inner = leaveBtn.querySelector('.clickAble');
            if (inner) {
              setStyles(inner, {
                'transform': 'skew(35deg)',
                'display': 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'width': '100%',
                'height': '100%',
                'font-size': '40px',
                'margin': '0',
                'padding': '0'
              });
            }
          }

          // Settings: pinned to right edge, absolutely
          if (settingsBtn) {
            topBar.appendChild(settingsBtn);
            setStyles(settingsBtn, {
              'position': 'absolute',
              'right': '0',
              'top': '50%',
              'transform': 'translateY(-50%)',
              'width': '200px',
              'height': '160px',
              'display': 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              'box-sizing': 'border-box'
            });
            settingsBtn.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
              setStyles(h, {
                'font-size': '40px',
                'margin': '0',
                'padding': '0',
                'line-height': '1',
                'text-align': 'center'
              });
            });
          }

          // Common style for middle buttons (Rules, Start)
          [rulesBtn, startBtn].forEach(el => {
            if (!el) return;
            setStyles(el, {
              'display': 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'justify-content': 'center',
              'width': '180px',
              'height': '160px',
              'box-sizing': 'border-box',
              'flex-shrink': '0',
              'margin': '10px',
            });
            el.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
              setStyles(h, {
                'font-size': '40px',
                'margin': '0',
                'padding': '0',
                'line-height': '1',
                'text-align': 'center',
                'white-space': 'normal',
                'word-break': 'break-word'
              });
            });
          });

          // Room name
          if (roomName) {
            setStyles(roomName, {
              'position': 'relative',
              'top': 'auto',
              'left': '180px',
              'right': 'auto',
              'bottom': 'auto',
              'display': 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'justify-content': 'center',
              'width': '150px',
              'height': '100px',
              'box-sizing': 'border-box',
              'flex-shrink': '0',
              'white-space': 'normal',
              'text-align': 'center',
              'overflow': 'visible'
            });
            roomName.querySelectorAll('h5, h6').forEach(h => {
              setStyles(h, {
                'margin': '0',
                'padding': '0',
                'line-height': '1.2',
                'text-align': 'center',
                'white-space': 'normal',
                'word-break': 'break-word',
                'font-size': '30px'
              });
            });
          }
        }


      } catch (e) {}

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
            onPress={debugRealBackgrounds}
          >
            <Text style={{ color: "white" }}>LAYOUT</Text>
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
