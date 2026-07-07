import com.egypteam.emulare.core.ui.internal.KeyboardSerialInternalFrame;
import com.egypteam.emulare.core.ui.internal.ScaleToledoPrix8217InternalFrame;
import com.egypteam.emulare.core.ui.internal.cashdrawer.CashDrawerSerialInternalFrame;
import com.egypteam.emulare.core.ui.internal.sitef.pinpad.PinpadSiTefFrame;
import com.formdev.flatlaf.FlatDarkLaf;

import javax.imageio.ImageIO;
import javax.swing.AbstractButton;
import javax.swing.JDesktopPane;
import javax.swing.JFrame;
import javax.swing.JInternalFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.border.EmptyBorder;
import java.awt.Color;
import java.awt.Component;
import java.awt.Container;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class EmulareScreenshotHarness {
    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException("Usage: EmulareScreenshotHarness <output-directory>");
        }

        Path outputDirectory = Path.of(args[0]);
        Files.createDirectories(outputDirectory);

        SwingUtilities.invokeAndWait(() -> {
            try {
                UIManager.setLookAndFeel(new FlatDarkLaf());

                captureCompleteWorkbench(outputDirectory);
                capture("keyboard-serial-emulator.png", outputDirectory, new KeyboardSerialInternalFrame(), 860, 660);
                capture("scale-toledo-prix-8217.png", outputDirectory, new ScaleToledoPrix8217InternalFrame(), 560, 520);
                capture("pinpad-sitef-emulator.png", outputDirectory, new PinpadSiTefFrame(), 520, 420);
                capture("cash-drawer-serial-emulator.png", outputDirectory, new CashDrawerSerialInternalFrame(), 520, 360);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });

        System.exit(0);
    }

    private static void capture(String fileName, Path outputDirectory, JInternalFrame internalFrame, int minWidth, int minHeight)
            throws Exception {
        int width = Math.max(minWidth, internalFrame.getWidth() + 48);
        int height = Math.max(minHeight, internalFrame.getHeight() + 48);

        JDesktopPane desktopPane = new JDesktopPane();
        desktopPane.setBackground(new Color(28, 31, 36));
        desktopPane.setPreferredSize(new Dimension(width, height));
        desktopPane.setSize(width, height);

        JFrame host = new JFrame("Emulare Screenshot");
        host.setUndecorated(true);
        host.setContentPane(desktopPane);
        host.setSize(width, height);

        internalFrame.setLocation(24, 24);
        desktopPane.add(internalFrame);
        internalFrame.setVisible(true);
        host.setVisible(true);
        host.doLayout();
        desktopPane.doLayout();
        internalFrame.doLayout();

        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        desktopPane.printAll(graphics);
        graphics.dispose();

        ImageIO.write(image, "png", outputDirectory.resolve(fileName).toFile());

        host.dispose();
    }

    private static void captureCompleteWorkbench(Path outputDirectory) throws Exception {
        int width = 1920;
        int height = 1080;

        JPanel application = new JPanel(new java.awt.BorderLayout());
        application.setBackground(new Color(28, 31, 36));
        application.setPreferredSize(new Dimension(width, height));
        application.setSize(width, height);

        JPanel header = new JPanel(new java.awt.BorderLayout(16, 0));
        header.setBackground(new Color(35, 39, 46));
        header.setBorder(new EmptyBorder(14, 18, 14, 18));

        JLabel title = new JLabel("Emulare Device Workbench");
        title.setForeground(new Color(238, 241, 245));
        title.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 20));
        header.add(title, java.awt.BorderLayout.WEST);

        JLabel scenario = new JLabel("Connected scenario: keyboard PLU input + stable scale read + approved pinpad sale + drawer pulse");
        scenario.setForeground(new Color(164, 176, 194));
        scenario.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
        header.add(scenario, java.awt.BorderLayout.EAST);

        JDesktopPane desktopPane = new JDesktopPane();
        desktopPane.setBackground(new Color(28, 31, 36));
        desktopPane.setPreferredSize(new Dimension(width, height - 58));

        KeyboardSerialInternalFrame keyboardFrame = new KeyboardSerialInternalFrame();
        ScaleToledoPrix8217InternalFrame scaleFrame = new ScaleToledoPrix8217InternalFrame();
        PinpadSiTefFrame pinpadFrame = new PinpadSiTefFrame();
        CashDrawerSerialInternalFrame drawerFrame = new CashDrawerSerialInternalFrame();
        JInternalFrame traceFrame = buildTraceFrame();

        addFrame(desktopPane, keyboardFrame, 18, 18, 820, 590);
        addFrame(desktopPane, scaleFrame, 862, 18, 500, 450);
        addFrame(desktopPane, pinpadFrame, 1384, 18, 500, 520);
        addFrame(desktopPane, drawerFrame, 862, 560, 1022, 176);
        addFrame(desktopPane, traceFrame, 18, 632, 820, 348);

        configureKeyboard(keyboardFrame);
        configureScale(scaleFrame);
        configurePinpad(pinpadFrame);
        configureCashDrawer(drawerFrame);

        application.add(header, java.awt.BorderLayout.NORTH);
        application.add(desktopPane, java.awt.BorderLayout.CENTER);

        JFrame host = new JFrame("Emulare Complete Device Workbench");
        host.setUndecorated(true);
        host.setContentPane(application);
        host.setSize(width, height);
        host.setVisible(true);
        host.doLayout();
        application.doLayout();
        desktopPane.doLayout();
        layoutTree(application);

        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        application.printAll(graphics);
        graphics.dispose();

        ImageIO.write(image, "png", outputDirectory.resolve("emulare-complete-device-workbench.png").toFile());

        host.dispose();
    }

    private static void addFrame(JDesktopPane desktopPane, JInternalFrame frame, int x, int y, int width, int height) {
        frame.setBounds(x, y, width, height);
        desktopPane.add(frame);
        frame.setVisible(true);
    }

    private static JInternalFrame buildTraceFrame() {
        JInternalFrame frame = new JInternalFrame("Connected Test Session", true, true, true, true);
        JTextArea trace = new JTextArea("""
                VIRTUAL LINKS
                /dev/pts/kbd-a    <-> /dev/pts/kbd-b       CONNECTED
                /dev/pts/scale-a  <-> /dev/pts/scale-b     CONNECTED
                /dev/pts/pinpad-a <-> /dev/pts/pinpad-b    CONNECTED
                /dev/pts/drawer-a <-> /dev/pts/drawer-b    CONNECTED

                TEST FLOW
                08:41:02 Keyboard TX  PLU-0042 ENTER
                08:41:03 Scale RX     READ_WEIGHT
                08:41:03 Scale TX     STABLE 1.245 kg
                08:41:04 Pinpad RX    SALE 42.90
                08:41:08 Pinpad TX    APPROVED AUTH 839214
                08:41:09 Drawer RX    OPEN_PULSE
                08:41:10 Drawer TX    STATUS OPEN

                RESULT
                Scenario completed with deterministic device responses.
                """);
        trace.setEditable(false);
        trace.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 14));
        trace.setBackground(new Color(17, 17, 17));
        trace.setForeground(new Color(214, 222, 233));
        trace.setBorder(new EmptyBorder(12, 12, 12, 12));
        frame.setContentPane(new JScrollPane(trace));
        return frame;
    }

    private static void configureKeyboard(JInternalFrame frame) {
        setButtonText(frame, "Port: -- None Selected --", "Port: /dev/pts/kbd-a");
        setButtonText(frame, "Open Port", "Close Port");
        setLabelText(frame, "Disconnected", "Connected: /dev/pts/kbd-b", new Color(102, 255, 102));

        List<JTextArea> areas = findComponents(frame, JTextArea.class);
        if (areas.size() >= 2) {
            areas.get(0).setText("PRODUCT: COFFEE BAG                    ");
            areas.get(1).setText("PLU-0042  QTY 01  TOTAL 42.90        ");
        }
        if (!areas.isEmpty()) {
            JTextArea log = areas.get(areas.size() - 1);
            log.setText("""
                    08:41:02 INFO Selected port updated to: /dev/pts/kbd-a
                    08:41:02 INFO Keyboard connected on /dev/pts/kbd-b
                    08:41:02 INFO Key pressed: K4
                    08:41:02 INFO Key pressed: K2
                    08:41:02 INFO Key pressed: ENTER
                    08:41:03 INFO Host command accepted: PLU-0042
                    """);
        }
    }

    private static void configureScale(JInternalFrame frame) throws Exception {
        setButtonText(frame, "-- Select Port --", "Port: /dev/pts/scale-a");
        setButtonText(frame, "Open Port", "Close Port");
        setLabelText(frame, "Disconnected", "Connected: /dev/pts/scale-b", new Color(102, 255, 102));

        Object panel = frame.getContentPane();
        Object device = readField(panel, "device");
        Method setGrossWeight = device.getClass().getMethod("setGrossWeight", double.class);
        setGrossWeight.invoke(device, 1.245d);

        Method updateWeightLabels = panel.getClass().getDeclaredMethod("updateWeightLabels");
        updateWeightLabels.setAccessible(true);
        updateWeightLabels.invoke(panel);
    }

    private static void configurePinpad(JInternalFrame frame) {
        setButtonText(frame, "Select Port...", "Port: /dev/pts/pinpad-a");
        setButtonText(frame, "Open Port", "Close Port");
        setLabelText(frame, "Disconnected", "Connected: /dev/pts/pinpad-b", new Color(102, 255, 102));

        List<JTextArea> areas = findComponents(frame, JTextArea.class);
        if (!areas.isEmpty()) {
            areas.get(0).setText("SALE 42.90\nAPPROVED");
        }
        if (areas.size() > 1) {
            areas.get(1).setText("""
                    SiTef Demo Receipt
                    Amount: 42.90
                    Card: TEST **** 4242
                    Auth: 839214
                    Status: APPROVED
                    """);
        }
    }

    private static void configureCashDrawer(JInternalFrame frame) {
        setLabelText(frame, "Status: -", "Status: ABERTA", new Color(102, 255, 102));
        setLabelText(frame, "Porta: (nenhuma)", "Porta: /dev/pts/drawer-a", Color.LIGHT_GRAY);
        setButtonsEnabled(frame, true);
    }

    private static <T extends Component> List<T> findComponents(Component root, Class<T> type) {
        List<T> matches = new ArrayList<>();
        if (type.isInstance(root)) {
            matches.add(type.cast(root));
        }
        if (root instanceof Container container) {
            for (Component child : container.getComponents()) {
                matches.addAll(findComponents(child, type));
            }
        }
        return matches;
    }

    private static void setButtonText(Component root, String currentText, String replacement) {
        for (AbstractButton button : findComponents(root, AbstractButton.class)) {
            if (currentText.equals(button.getText())) {
                button.setText(replacement);
                button.setEnabled(true);
                return;
            }
        }
    }

    private static void setLabelText(Component root, String currentText, String replacement, Color foreground) {
        for (JLabel label : findComponents(root, JLabel.class)) {
            if (currentText.equals(label.getText())) {
                label.setText(replacement);
                label.setForeground(foreground);
                return;
            }
        }
    }

    private static void setButtonsEnabled(Component root, boolean enabled) {
        for (AbstractButton button : findComponents(root, AbstractButton.class)) {
            button.setEnabled(enabled);
        }
    }

    private static Object readField(Object target, String fieldName) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        return field.get(target);
    }

    private static void layoutTree(Component component) {
        component.doLayout();
        if (component instanceof Container container) {
            for (Component child : container.getComponents()) {
                layoutTree(child);
            }
        }
    }
}
