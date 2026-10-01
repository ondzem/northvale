/**
 * Styly stránek objednávky — sdílí je „Děkujeme za objednávku“
 * (OrderConfirmation) a „Stav objednávky“ (OrderView), aby vypadaly stejně.
 */
export const ORDER_PAGE_CSS = `
        .order-confirm-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 64px 24px;
          min-height: 80vh;
          background-color: #18181C;
          font-family: "Inter Tight", system-ui, sans-serif;
          color: #F0F0F0;
        }

        .order-confirm-card {
          width: 100%;
          max-width: 600px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .ocf-check {
          width: 84px;
          height: 84px;
          margin-bottom: 28px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .ocf-check-ring {
          stroke-dasharray: 150;
          stroke-dashoffset: 150;
          animation: ring-draw 0.6s ease-out forwards;
        }

        .ocf-check-tick {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: checkmark-draw 0.4s ease-out 0.4s forwards;
        }

        @keyframes ring-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes checkmark-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        .ocf-title {
          font-size: 38px;
          font-weight: 800;
          color: #F0F0F0;
          margin: 0 0 14px 0;
          line-height: 1.2;
          font-family: "Outfit", "Inter Tight", sans-serif;
        }

        .ocf-num {
          font-size: 16px;
          color: #8A8A92;
          margin: 0 0 44px 0;
        }

        .ocf-gold-text {
          color: #FDBD16;
          font-weight: 700;
          margin-left: 4px;
        }

        .ocf-ship {
          width: 100%;
          border-top: 1px solid rgba(240, 240, 240, 0.07);
          border-bottom: 1px solid rgba(240, 240, 240, 0.07);
          padding: 24px 0;
          margin-bottom: 36px;
          text-align: left;
        }

        .ocf-ship-head {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #FDBD16;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 18px;
          letter-spacing: 0.05em;
        }

        .ocf-ship-method {
          font-size: 17px;
          color: #F0F0F0;
          margin: 0 0 14px 0;
        }

        .ocf-ship-note {
          font-size: 14.5px;
          line-height: 1.6;
          color: #8A8A92;
          margin: 0;
        }

        .ocf-summary {
          width: 100%;
          text-align: left;
          margin-bottom: 32px;
        }

        .ocf-summary-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #50505A;
          margin-bottom: 18px;
          letter-spacing: 0.05em;
        }

        .ocf-irow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 4px 0 18px 0;
          font-size: 16px;
          color: #F0F0F0;
        }

        .ocf-iname {
          font-weight: 600;
        }

        .ocf-iqty {
          color: #50505A;
          font-size: 14px;
          font-weight: 400;
        }

        .ocf-iprice {
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        .ocf-srow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 16px 0;
          border-top: 1px solid rgba(240, 240, 240, 0.07);
          font-size: 15px;
          color: #8A8A92;
        }

        .ocf-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 16px 0 0 0;
          border-top: 1px solid rgba(240, 240, 240, 0.07);
          font-size: 16px;
          color: #F0F0F0;
          font-weight: 700;
        }

        .ocf-total-val {
          font-size: 26px;
          font-weight: 800;
          color: #FDBD16;
          font-variant-numeric: tabular-nums;
        }

        .ocf-email {
          font-size: 13.5px;
          line-height: 1.6;
          color: #8A8A92;
          margin: 0 0 28px 0;
          text-align: center;
        }

        .ocf-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          width: 100%;
        }

        .ocf-btn-primary {
          background-color: #FDBD16;
          color: #1A1407;
          border: none;
          height: 49px;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 700;
          padding: 0 30px;
          cursor: pointer;
          transition: background-color 0.16s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ocf-btn-primary:hover {
          background-color: #E2A80F;
        }

        .ocf-btn-ghost {
          background-color: transparent;
          color: #F0F0F0;
          border: 1px solid rgba(240, 240, 240, 0.12);
          height: 49px;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 600;
          padding: 0 30px;
          cursor: pointer;
          transition: border-color 0.16s ease, background-color 0.16s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ocf-btn-ghost:hover {
          border-color: rgba(240, 240, 240, 0.3);
          background-color: rgba(255, 255, 255, 0.02);
        }

        @media (max-width: 480px) {
          .ocf-title {
            font-size: 32px;
          }
          .ocf-actions {
            flex-direction: column;
            gap: 12px;
          }
          .ocf-btn-primary, .ocf-btn-ghost {
            width: 100%;
          }
        }
      `;
