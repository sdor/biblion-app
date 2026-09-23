import { Page } from '@playwright/test';

/**
 * Simulates Microsoft Word Office.js host environment inside the browser.
 * Intercepts the Microsoft Office CDN script and provides mock Word runtime objects.
 */
export async function simulateWordHost(page: Page) {
  // Intercept Office.js CDN to inject Word host runtime before Angular initializes
  await page.route('https://appsforoffice.microsoft.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.Office = {
          HostType: {
            Word: 'Word',
            Excel: 'Excel',
            PowerPoint: 'PowerPoint',
            Outlook: 'Outlook'
          },
          context: {
            host: 'Word',
            platform: 'PC'
          },
          onReady: function(callback) {
            var info = { host: 'Word', platform: 'PC' };
            if (typeof callback === 'function') {
              callback(info);
            }
            return Promise.resolve(info);
          }
        };
      `,
    });
  });

  await page.addInitScript(() => {
    (window as any).Office = {
      HostType: {
        Word: 'Word',
        Excel: 'Excel',
        PowerPoint: 'PowerPoint',
        Outlook: 'Outlook',
      },
      context: {
        host: 'Word',
        platform: 'PC',
      },
      onReady: (callback?: (info: any) => void) => {
        const info = { host: 'Word', platform: 'PC' };
        if (typeof callback === 'function') {
          callback(info);
        }
        return Promise.resolve(info);
      },
    };

    const insertedControls: any[] = [];

    function createMockControl(tag = '', title = '') {
      const ctrl: any = {
        appearance: 'boundingBox',
        title,
        tag,
        font: { name: 'Calibri', size: 12, bold: false, superscript: false },
        cannotDelete: false,
        insertText: (_text: string) => {},
        insertParagraph: (text = '') => createMockParagraph(text),
        clear: () => {},
        delete: () => {
          const idx = insertedControls.indexOf(ctrl);
          if (idx >= 0) insertedControls.splice(idx, 1);
        },
        getRange: () => ({
          expandTo: () => ({
            load: () => {},
            text: ' ',
          }),
        }),
      };
      insertedControls.push(ctrl);
      return ctrl;
    }

    function createMockParagraph(text = '') {
      return {
        text,
        font: { bold: false, size: 12, name: 'Calibri' },
        lineSpacing: 1,
        spaceAfter: 0,
        insertContentControl: () => createMockControl(),
        insertParagraph: (t = '') => createMockParagraph(t),
      };
    }

    (window as any).Word = {
      ContentControlAppearance: {
        boundingBox: 'boundingBox',
        tags: 'tags',
        hidden: 'hidden',
      },
      InsertLocation: {
        before: 'Before',
        after: 'After',
        start: 'Start',
        end: 'End',
        replace: 'Replace',
      },
      RangeLocation: {
        after: 'After',
        before: 'Before',
        whole: 'Whole',
      },
      run: async (batch: (context: any) => Promise<any>) => {
        const mockContext = {
          sync: async () => {},
          document: {
            body: {
              insertParagraph: (text: string) => createMockParagraph(text),
              getRange: () => ({
                font: { name: 'Calibri', size: 12 },
                load: () => {},
              }),
            },
            contentControls: {
              items: insertedControls,
              load: () => {},
              getByTag: (tag: string) => ({
                items: insertedControls.filter((c) => c.tag === tag),
                load: () => {},
              }),
            },
            getSelection: () => {
              const dummyControl = createMockControl('biblion-citation', 'Biblion Citation');
              return {
                parentContentControlOrNullObject: {
                  isNullObject: true,
                  load: () => {},
                },
                parentContentControl: { isNullObject: true },
                insertContentControl: () => dummyControl,
              };
            },
          },
        };
        return await batch(mockContext);
      },
    };
  });
}
