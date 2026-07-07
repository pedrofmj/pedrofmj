import com.egypteam.emulare.core.ui.internal.KeyboardSerialInternalFrame;
import com.egypteam.emulare.core.ui.internal.ScaleToledoPrix8217InternalFrame;
import com.egypteam.emulare.core.ui.internal.cashdrawer.CashDrawerSerialInternalFrame;
import com.egypteam.emulare.core.ui.internal.sitef.pinpad.PinpadSiTefFrame;
import com.formdev.flatlaf.FlatDarkLaf;

import javax.imageio.ImageIO;
import javax.swing.JDesktopPane;
import javax.swing.JFrame;
import javax.swing.JInternalFrame;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;

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
}
